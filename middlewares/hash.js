const bcrypt = require('bcrypt');

(async () => {
  const hash = await bcrypt.hash('GMDashboard2026!', 10);
  console.log(hash);
})();