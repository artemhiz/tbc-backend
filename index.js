const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const menuRouter = require('./requests');
require('dotenv').config();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api/menu', menuRouter);

mongoose.connect(process.env.MONGODB_MENU)
.then(() => console.log('Connected to MongoDB'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server runs at port ${PORT}`));