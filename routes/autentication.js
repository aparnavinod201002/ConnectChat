const express = require("express");
const { login } = require("../controllers/authentication");
const router = express.Router();

router.post("/login", login);

module.exports = router;