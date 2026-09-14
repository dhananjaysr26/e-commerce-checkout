# API Documentation

## `GET /products`
Returns a list of all products in the catalog.
- **Response**: Array of product objects containing `id`, `name`, `unitPriceMinor`, `currency`, and `inventory`.

## `POST /carts`
Retrieves the active (OPEN) cart for the current user. If no active cart exists, creates one.
- **Response**: Cart object containing `id`, `status` (OPEN), and `items` (array of current cart items).

## `GET /carts/:cartId`
Retrieves a specific cart by its ID.
- **Parameters**: `cartId` (UUID)
- **Response**: Cart object.

## `POST /carts/:cartId/items`
Adds a product to the cart or increments its quantity if it already exists.
- **Parameters**: `cartId` (UUID)
- **Body**:
  ```json
  {
    "productId": "uuid",
    "quantity": 1
  }
  ```
- **Rules**:
  - `productId` must exist.
  - `quantity` must be a positive integer.
  - Inventory is NOT reserved at this stage (only verified during checkout).
  - Existing `CartItem` rows will have their `quantity` updated rather than duplicated.
- **Response**: Updated Cart object.
