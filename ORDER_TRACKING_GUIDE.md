# Order Tracking & History Feature

## Overview

The order tracking and history feature allows customers to view all their past orders with detailed information about each order's status, items, shipping address, and delivery tracking.

## Features Implemented

### Frontend Components

- **Orders.jsx** - New component displaying user's complete order history
- **Navigation** - Added "Shop" and "My Orders" buttons in the header for easy switching
- **Order Cards** - Expandable cards showing order summary with quick details
- **Order Details** - Expandable sections showing:
  - Status timeline with visual progress indicator
  - Itemized order details table
  - Shipping address information
  - Tracking number (when available)

### Backend Endpoints

#### Get User's Orders

```
GET /api/orders/:userId
```

Returns all orders for a user, sorted by creation date (newest first).

#### Update Order Status

```
PUT /api/orders/:orderId/status
```

Request body:

```json
{
  "status": "confirmed|shipped|delivered|cancelled",
  "trackingNumber": "optional tracking number"
}
```

Valid statuses:

- `pending` - Order just placed
- `confirmed` - Order confirmed by seller
- `shipped` - Order dispatched
- `delivered` - Order delivered
- `cancelled` - Order cancelled

### Database Schema

Orders include:

- Order ID (MongoDB ObjectId)
- User ID (linked to user)
- Items array (product details with quantity)
- Total price
- Status (with timeline visualization)
- Shipping address
- Tracking number
- Created/Updated timestamps

## User Experience Flow

### 1. Placing an Order

1. User adds products to cart
2. Clicks "Checkout"
3. Order is created with `pending` status
4. Confirmation message displays
5. Cart clears

### 2. Checking Order History

1. User clicks "📦 My Orders" in header
2. View switches to Orders page
3. All orders display in reverse chronological order
4. Each order shows:
   - Order ID (last 8 chars)
   - Date and time
   - Current status badge
   - Number of items
   - Total price

### 3. Viewing Order Details

1. Click on any order card to expand
2. See full order details including:
   - **Status Timeline**: Visual progress from pending → confirmed → shipped → delivered
   - **Order Items**: Table with product names, quantities, prices
   - **Shipping Address**: Full delivery address details
   - **Tracking**: Tracking number if order is shipped

### 4. Status Progression

Orders follow this flow:

```
Pending → Confirmed → Shipped → Delivered
```

Each stage in the timeline displays with an icon and changes from gray (inactive) to green (active/complete).

## API Usage Examples

### Fetch user orders

```bash
curl http://localhost:3000/api/orders/USER_ID
```

### Update order status (admin/backend only)

```bash
curl -X PUT http://localhost:3000/api/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```

### Update with tracking number

```bash
curl -X PUT http://localhost:3000/api/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped", "trackingNumber": "TRACK123456"}'
```

## Testing the Feature

### Manual Testing Steps

1. **Start the app**:

   ```bash
   # Terminal 1: Backend
   cd backend
   node server.js

   # Terminal 2: Frontend
   cd frontend
   npm run dev

   # Terminal 3 (optional): Streamlit chatbot
   cd ..
   streamlit run chatbot.py
   ```

2. **Create an order**:
   - Sign up / login
   - Browse products
   - Add products to cart
   - Click "Checkout"
   - Order created with `pending` status

3. **View orders**:
   - Click "📦 My Orders" button
   - See all your orders
   - Click any order to expand details

4. **Update order status** (Testing with curl):

   ```bash
   # Get order ID from the orders list
   # Then update status
   curl -X PUT http://localhost:3000/api/orders/[ORDER_ID]/status \
     -H "Content-Type: application/json" \
     -d '{"status": "confirmed"}'
   ```

5. **Refresh and verify**:
   - Go back to "My Orders"
   - Click order to see updated status in timeline

## CSS Features

### Styling Components

- **Status Badges** - Color-coded by status (orange=pending, blue=confirmed, green=shipped/delivered, red=cancelled)
- **Timeline Visualization** - Shows visual progress with connecting lines
- **Responsive Layout** - Works on mobile, tablet, and desktop
- **Smooth Animations** - Order details expand/collapse smoothly

### Responsive Design

- Desktop: Full 2-column layout with cart sidebar
- Tablet: Single column layout
- Mobile: Optimized navigation and compact tables

## Future Enhancements

### Possible additions:

1. **Email Notifications** - Send status update emails
2. **SMS Notifications** - Text updates via SMS gateway
3. **Estimated Delivery Date** - Calculate and display ETA
4. **Cancel Order** - Allow users to cancel pending orders
5. **Download Invoice** - PDF receipt generation
6. **Return/Refund** - Request returns for delivered orders
7. **Admin Dashboard** - Bulk update orders, view analytics
8. **Real Tracking Integration** - Connect with shipping APIs (Shipstation, EasyPost)

## Files Modified/Created

### Created

- `frontend/src/Orders.jsx` - Order display component with timeline

### Modified

- `frontend/src/App.jsx` - Added page routing and Orders integration
- `frontend/src/style.css` - Added 400+ lines of styles for Orders
- `backend/server.js` - Added PUT /api/orders/:orderId/status endpoint

### Existing (No changes)

- `backend/models/Order.js` - Already had all needed fields
- `backend/models/User.js` - Already linked to orders
- `frontend/src/Auth.jsx` - User management unchanged

## Deployment Notes

1. **Environment Variables**: No new env vars needed
2. **Database**: Orders already stored in MongoDB
3. **Ports**: No new ports needed (uses existing 3000, 5173, 8501)
4. **Dependencies**: No new npm packages or pip packages added

## Troubleshooting

### Issue: Orders not loading

- Check MongoDB connection
- Verify userId is correctly stored in localStorage
- Check browser console for errors

### Issue: Status update not working

- Verify PUT endpoint is accessible
- Check orderId is valid
- Verify status is one of: pending, confirmed, shipped, delivered, cancelled

### Issue: Timeline not showing correctly

- Check order status value in database
- Verify CSS is loaded (check browser DevTools)
- Clear browser cache if styling looks wrong

## Performance Considerations

- Orders sorted by creation date on backend
- Expandable details prevent loading large data upfront
- No pagination added yet (add if order count exceeds 100)
- Consider adding caching for frequently accessed orders

---

**Status**: ✅ Fully implemented and ready for testing

**Last Updated**: April 9, 2026
