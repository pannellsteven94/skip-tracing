require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const API_KEY = process.env.BATCHLEADS_API_KEY; // Set in .env file

// Route to fetch property details
app.post('/property', async (req, res) => {
    const { address } = req.body;

    try {
        const response = await axios.post('https://api.batchleads.io/v1/properties', {
            address
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching data from Batch Leads:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch property data' });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
