const bcrypt = require('bcryptjs');

const password = 'ADminpassword123';

bcrypt.hash(password, 10).then(hash => {
  console.log(hash);
}).catch(err => {
  console.error('Error generating hash:', err);
});
