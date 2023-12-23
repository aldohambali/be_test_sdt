const router = require('express').Router();
const { users } = require('../controllers');

// GET localhost:8080/karyawan => Ambil data semua karyawan
router.get('/users', users.getDataUsers);

// GET localhost:8080/karyawan/2 => Ambil data semua karyawan berdasarkan id = 2
router.get('/users/:id', users.getDataUsersByID);

router.post('/users/add', users.addDataUsers);

router.put('/users/edit', users.editDataUsers);

router.post('/users/delete', users.deleteDataUsers);

module.exports = router;