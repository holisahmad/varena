# 10 — UI/UX Specification

## 1. Art direction
Premium, calm, credible, warm, precise. Brown-gold is an accent system, not a mandate to make every surface gold.

Palette:
- Espresso: #3B281D
- Deep brown: #513A2B
- Soft gold: #B99151
- Champagne: #D6B16C
- Warm ivory: #F7F4EE
- Surface: #FFFFFF
- Text: #29231F
- Muted: #786F66
- Success/warning/error use accessible semantic colors, not gold.

Typography: modern readable sans for UI; optional restrained serif only for editorial hero headings. Use consistent type scale and line-height.

Avoid:
- excessive gradients, glassmorphism, floating blobs, generic AI illustrations,
- oversized rounded cards everywhere,
- decorative charts without decision value,
- fake testimonials, fake ratings, fake scarcity, income promises,
- animations that delay task completion.

## 2. Responsive behavior
### Mobile-first
- Bottom navigation for member portal: Home, Network, Orders, Wallet, Profile.
- One primary action per screen.
- Compact summary cards; details progressively disclosed.
- Network tree is a searchable/drill-down hierarchy, not a tiny full-tree canvas.
- Tables become labeled list rows or focused detail screens.
- Checkout uses single-column steps and sticky order summary where appropriate.
- Touch targets >= 44px.

### Desktop
- Persistent left sidebar.
- Wider analytics and data tables.
- Multi-column admin workspaces.
- Network explorer with search, breadcrumb, subtree pagination.
- Side panel for member/order details.
- Bulk actions only with confirmation and audit reason.

## 3. Main routes
Public:
- `/`
- `/products`
- `/products/[slug]`
- `/r/[code]`
- `/checkout`
- `/order/[token]`
- `/about`, `/terms`, `/privacy`, `/contact`

Member:
- `/member`
- `/member/network`
- `/member/referral`
- `/member/orders`
- `/member/commissions`
- `/member/wallet`
- `/member/withdrawals`
- `/member/profile`

Admin:
- `/admin`
- `/admin/members`
- `/admin/network`
- `/admin/products`
- `/admin/orders`
- `/admin/commissions`
- `/admin/marketing-plan`
- `/admin/withdrawals`
- `/admin/reports`
- `/admin/audit`

## 4. Dashboard hierarchy
Member dashboard:
1. Available balance and pending/held amounts clearly distinguished.
2. Sales summary.
3. Commission summary by type/status.
4. Referral link share action.
5. Recent orders/commission events.
6. Network snapshot with privacy-safe counts.

Admin dashboard:
1. Net sales and order status.
2. Gross margin / contribution margin.
3. Commission liability (pending, payable, held, paid, unallocated).
4. Payout approvals.
5. Operational exceptions.
6. Audit alerts.

## 5. Content and trust
- Explain price, pack size, HPP is internal only, delivery, returns, and reward terms.
- Show commission terms in plain language.
- Never promise income or guaranteed results.
- Product health claims must be evidence-backed and legally approved.
- Show consent and privacy policy at data collection.
- Referral attribution rules must be disclosed.

## 6. Design deliverables
- Design tokens.
- Responsive sitemap.
- Key wireframes.
- Component inventory.
- Interaction states (loading, empty, error, success, disabled).
- Accessibility review.
- Mobile and desktop prototypes.
