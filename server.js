require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Environment variables for Batch Leads credentials
const { BATCHLEADS_EMAIL, BATCHLEADS_PASSWORD } = process.env;

// Function to fetch a new Bearer Token
const getBearerToken = async () => {
    try {
        console.log("Generating Bearer Token...");
        const response = await axios.post('https://api-server.batchleadstacker.com/app/login', {
            email: BATCHLEADS_EMAIL,
            password: BATCHLEADS_PASSWORD,
        });

        if (response.data?.data?.token) {
            console.log("Bearer Token generated successfully.");
            return response.data.data.token;
        } else {
            throw new Error("Token generation failed: " + JSON.stringify(response.data));
        }
    } catch (error) {
        console.error("Error generating token:", error.response?.data || error.message);
        throw new Error("Failed to generate token. Verify credentials or API access.");
    }
};

// Function to fetch property data from Batch Leads API
const fetchPropertyData = async (address, token) => {
    try {
        console.log("Sending property lookup request with token:", token);
        console.log("Address payload:", { requests: [{ address: { street: address } }] });

        const response = await axios.post(
            'https://api.batchdata.com/api/v1/property/lookup/all-attributes',
            {
                requests: [{ address: { street: address } }],
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
            console.log("Property data fetched successfully.");
            return response.data.results.properties[0];
        } else {
            throw new Error("No property data found for the given address.");
        }
    } catch (error) {
        console.error("Error fetching property data:", error.response?.data || error.message);
        throw error;
    }
};

// Endpoint to handle property lookup
app.post('/property', async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ error: "Address is required." });
    }

    try {
        console.log("Looking up property for address:", address);

        // Step 1: Generate a new Bearer Token
        let token = await getBearerToken();

        // Step 2: Fetch property data
        try {
            const propertyData = await fetchPropertyData(address, token);
            return res.status(200).json({ property: propertyData });
        } catch (error) {
            if (error.response?.status === 401) {
                console.warn("Invalid token detected. Retrying with a new token...");
                token = await getBearerToken();
                const retryPropertyData = await fetchPropertyData(address, token);
                return res.status(200).json({ property: retryPropertyData });
            }
            throw error;
        }
    } catch (error) {
        console.error("Error in /property endpoint:", error.response?.data || error.message);
        return res.status(500).json({
            error: "Failed to fetch property data.",
            details: error.response?.data || error.message,
        });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running at https://skip-tracing.onrender.com`));
