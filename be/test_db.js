const { sequelize } = require('./src/models');
async function test() {
  const t = await sequelize.transaction();
  const [results, metadata] = await sequelize.query("UPDATE products SET inventory = inventory - 1000 WHERE id = 'a0000002-0000-4000-8000-000000000002' AND inventory >= 1000", { transaction: t });
  console.log("Metadata:", metadata);
  console.log("results:", results);
  console.log("metadata === 0 ?", metadata === 0);
  console.log("metadata.rowCount:", metadata.rowCount);
  await t.rollback();
  await sequelize.close();
}
test();
