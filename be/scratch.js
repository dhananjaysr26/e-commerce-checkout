require('dotenv').config();
process.env.NODE_ENV = 'test';
const { getOrCreateCart } = require('./src/handlers/carts/carts');
const jwt = require('jsonwebtoken');

(async () => {
  const event = {
    headers: { Authorization: `Bearer ${jwt.sign({ id: '11111111-1111-1111-1111-111111111111', role: 'customer' }, process.env.JWT_SECRET || 'supersecret')}` }
  };
  const res = await getOrCreateCart(event);
  console.log(res);
})();
