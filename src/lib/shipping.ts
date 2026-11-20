/**
 * SHIPPING INTEGRATION — VARENA Platform
 *
 * Status: DISABLED (SHIPPING_API_ENABLED=false)
 * To activate: set SHIPPING_API_ENABLED=true + BITESHIP_API_KEY
 *
 * Provider: Biteship (mendukung JNE, J&T, SiCepat, Anteraja, GoSend, GrabExpress, dll.)
 * Fallback: Returns empty list → UI shows manual resi input
 */

export interface ShippingRate {
  courier: string;
  courierCode: string;
  service: string;
  serviceCode: string;
  price: number;        // IDR
  estimatedDays: string;
  description: string;
}

export interface ShippingRateRequest {
  destinationCity: string;
  destinationProvince: string;
  weightGrams: number;
  itemValue: number;
}

export interface CreateShipmentRequest {
  orderId: string;
  orderNumber: string;
  courierCode: string;
  serviceCode: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientProvince: string;
  recipientPostalCode?: string;
  weightGrams: number;
  itemDescription: string;
  itemValue: number;
}

export interface CreateShipmentResult {
  trackingNumber: string;
  courierLabel: string;
  estimatedDelivery: string;
  labelUrl?: string;
}

const BITESHIP_BASE = 'https://api.biteship.com/v1';

async function biteshipRequest(path: string, method: 'GET' | 'POST', body?: any) {
  const apiKey = process.env.BITESHIP_API_KEY;
  if (!apiKey) throw new Error('BITESHIP_API_KEY tidak dikonfigurasi');

  const res = await fetch(`${BITESHIP_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Biteship API error ${res.status}: ${errText}`);
  }
  return res.json();
}

/**
 * Dapatkan tarif pengiriman yang tersedia untuk tujuan.
 * Returns [] when disabled — UI should show manual shipping input.
 */
export async function getShippingRates(req: ShippingRateRequest): Promise<ShippingRate[]> {
  if (process.env.SHIPPING_API_ENABLED !== 'true') {
    return [];
  }

  try {
    const originLat = parseFloat(process.env.BITESHIP_ORIGIN_LAT || '-6.2088');
    const originLng = parseFloat(process.env.BITESHIP_ORIGIN_LNG || '106.8456');

    const data = await biteshipRequest('/rates/couriers', 'POST', {
      origin_latitude: originLat,
      origin_longitude: originLng,
      destination_city_name: req.destinationCity,
      destination_province_name: req.destinationProvince,
      couriers: 'jne,jnt,sicepat,anteraja,pos',
      items: [
        {
          name: 'Produk VARENA',
          description: 'Produk kesehatan & kecantikan',
          value: req.itemValue,
          length: 20,
          width: 15,
          height: 10,
          weight: req.weightGrams,
        },
      ],
    });

    return (data.pricing || []).map((p: any) => ({
      courier: p.courier_name,
      courierCode: p.courier_code,
      service: p.courier_service_name,
      serviceCode: p.courier_service_code,
      price: p.price,
      estimatedDays: p.shipment_duration_range || '1-3 hari',
      description: p.description || '',
    }));
  } catch (err) {
    console.error('[Shipping] getShippingRates error:', err);
    return [];
  }
}

/**
 * Buat pesanan pengiriman via Biteship.
 * Returns null when disabled — caller uses manual resi flow.
 */
export async function createShipmentOrder(req: CreateShipmentRequest): Promise<CreateShipmentResult | null> {
  if (process.env.SHIPPING_API_ENABLED !== 'true') {
    return null;
  }

  try {
    const originLat = parseFloat(process.env.BITESHIP_ORIGIN_LAT || '-6.2088');
    const originLng = parseFloat(process.env.BITESHIP_ORIGIN_LNG || '106.8456');
    const originAddress = process.env.BITESHIP_ORIGIN_ADDRESS || 'Jakarta Pusat';

    const data = await biteshipRequest('/orders', 'POST', {
      shipper_contact_name: 'VARENA',
      shipper_contact_phone: '021-00000000',
      shipper_contact_email: 'cs@varena.id',
      origin_contact_name: 'VARENA Warehouse',
      origin_contact_phone: '021-00000000',
      origin_address: originAddress,
      origin_coordinate: { latitude: originLat, longitude: originLng },
      destination_contact_name: req.recipientName,
      destination_contact_phone: req.recipientPhone,
      destination_address: req.recipientAddress,
      destination_city_name: req.recipientCity,
      destination_province_name: req.recipientProvince,
      destination_postal_code: req.recipientPostalCode || '',
      courier_company: req.courierCode,
      courier_type: req.serviceCode,
      delivery_type: 'now',
      order_note: `Pesanan VARENA #${req.orderNumber}`,
      reference_id: req.orderNumber,
      items: [
        {
          name: req.itemDescription,
          description: req.itemDescription,
          value: req.itemValue,
          weight: req.weightGrams,
          quantity: 1,
        },
      ],
      metadata: { orderId: req.orderId },
    });

    return {
      trackingNumber: data.courier?.tracking_id || data.id || '',
      courierLabel: data.courier?.company || req.courierCode,
      estimatedDelivery: data.courier?.estimated_delivery_at || '1-3 hari',
      labelUrl: data.courier?.waybill_id || undefined,
    };
  } catch (err) {
    console.error('[Shipping] createShipmentOrder error:', err);
    return null;
  }
}

/**
 * Lacak status pengiriman.
 * Returns null when disabled.
 */
export async function trackShipment(trackingNumber: string, courierCode: string): Promise<any> {
  if (process.env.SHIPPING_API_ENABLED !== 'true') return null;

  try {
    return await biteshipRequest(`/trackings/${courierCode}/${trackingNumber}`, 'GET');
  } catch (err) {
    console.error('[Shipping] trackShipment error:', err);
    return null;
  }
}
