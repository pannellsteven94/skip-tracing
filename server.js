require('dotenv').config();
const express = require('express');
const cors = require('cors');
const propertyRoutes = require('./routes/property');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/property', propertyRoutes);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
