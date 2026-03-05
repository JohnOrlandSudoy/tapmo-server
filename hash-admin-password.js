const bcrypt = require('bcryptjs');

const password = 'adminTapbosscard123';

bcrypt.hash(password, 10).then(hash => {
  console.log(hash);
}).catch(err => {
  console.error('Error generating hash:', err);
});
