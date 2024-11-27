require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const { BATCHLEADS_EMAIL, BATCHLEADS_PASSWORD } = process.env;

// Function to get Bearer Token
const getBearerToken = async () => {
    try {
        const response = await axios.post('https://api-server.batchleadstacker.com/app/login', {
            email: BATCHLEADS_EMAIL,
            password: BATCHLEADS_PASSWORD
        });

        if (response.data?.data?.token) {
            console.log("Bearer Token generated successfully");
            return response.data.data.token;
        } else {
            throw new Error("Failed to generate token: " + JSON.stringify(response.data));
        }
    } catch (error) {
        console.error("Error generating token:", error.response?.data || error.message);
        throw new Error("Invalid credentials or expired plan.");
    }
};

// Function to fetch property data
const fetchPropertyData = async (address, token) => {
    try {
        const response = await axios.post(
            'https://api.batchdata.com/api/v1/property/lookup/all-attributes',
            {
                requests: [{ address: { street: address } }]
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            }
        );

        if (response.data?.results?.properties?.length) {
            return response.data.results.properties[0];
        } else {
            throw new Error("No property data found.");
        }
    } catch (error) {
        throw error;
    }
};

// Endpoint for property lookup
app.post('/property', async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ error: "Address is required" });
    }

    try {
        console.log("Fetching property data for address:", address);

        let token = await getBearerToken();
        try {
            const propertyData = await fetchPropertyData(address, token);
            return res.status(200).json({ property: propertyData });
        } catch (error) {
            if (error.response?.status === 401) {
                console.warn("Invalid token detected. Retrying with a new token...");
                token = await getBearerToken();
                const retryResponse = await fetchPropertyData(address, token);
                return res.status(200).json({ property: retryResponse });
            }
            throw error;
        }
    } catch (error) {
        console.error("Error fetching property data:", error.response?.data || error.message);
        res.status(500).json({
            error: "Failed to fetch property data",
            details: error.response?.data || error.message,
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
