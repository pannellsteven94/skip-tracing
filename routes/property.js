const express = require('express');
const axios = require('axios');
const generateToken = require('../utils/generateToken');

const router = express.Router();

router.post('/', async (req, res) => {
    const { address } = req.body;

    if (!address || !address.street || !address.city || !address.state || !address.zip) {
        return res.status(400).json({
            error: "Invalid address format. Street, city, state, and zip are required.",
        });
    }

    try {
        const token = await generateToken(); // Generate or retrieve token

        const response = await axios.post(
            'https://api.batchdata.com/api/v1/property/lookup/all-attributes',
            { requests: [{ address }] },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data && response.data.results && response.data.results.properties) {
            return res.json({ property: response.data.results.properties[0] });
        } else {
            return res.status(404).json({ error: "No property data found." });
        }
    } catch (error) {
        console.error("Error in /property endpoint:", error.message);
        return res.status(500).json({
            error: "Failed to fetch property data.",
            details: error.response?.data || error.message,
        });
    }
});

module.exports = router;
