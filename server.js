require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Environment variables for Batch Leads credentials
const { BATCHLEADS_EMAIL, BATCHLEADS_PASSWORD } = process.env;

// Store the token globally
let bearerToken = null;

// Function to generate a Bearer Token
const getBearerToken = async () => {
    try {
        console.log("Generating a new Bearer Token...");
        const response = await axios.post('https://api-server.batchleadstacker.com/app/login', {
            email: BATCHLEADS_EMAIL,
            password: BATCHLEADS_PASSWORD,
        });

        if (response.data?.data?.token) {
            bearerToken = response.data.data.token;
            console.log("Bearer Token generated successfully:", bearerToken);
            return bearerToken;
        } else {
            throw new Error("Token generation failed. Response: " + JSON.stringify(response.data));
        }
    } catch (error) {
        console.error("Error generating token:", error.response?.data || error.message);
        throw new Error("Failed to generate token. Verify your credentials.");
    }
};

// Function to fetch property data from Batch Leads
const fetchPropertyData = async (address) => {
    try {
        if (!bearerToken) {
            console.log("No token found. Fetching a new one...");
            await getBearerToken();
        }

        console.log("Using Bearer Token:", bearerToken);
        console.log("Sending request with address:", address);

        const response = await axios.post(
            'https://api.batchdata.com/api/v1/property/lookup/all-attributes',
            {
                requests: [
                    {
                        address: {
                            street: address.street,
                            city: address.city,
                            state: address.state,
                            zip: address.zip,
                        },
                    },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${bearerToken}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            }
        );

        if (response.data?.results?.properties?.length) {
            console.log("Property data fetched successfully.");
            return response.data.results.properties[0];
        } else {
            throw new Error("No property data found for the provided address.");
        }
    } catch (error) {
        console.error("Error fetching property data:", error.response?.data || error.message);

        if (error.response?.status === 401) {
            console.warn("Invalid token detected. Refreshing token...");
            await getBearerToken(); // Refresh the token
            return await fetchPropertyData(address); // Retry with a new token
        }

        throw error;
    }
};

// Endpoint to handle property lookup
app.post('/property', async (req, res) => {
    const { address } = req.body;

    if (!address || !address.street || !address.city || !address.state || !address.zip) {
        return res.status(400).json({ error: "Invalid address format. Street, city, state, and zip are required." });
    }

    try {
        const propertyData = await fetchPropertyData(address);
        return res.status(200).json({ property: propertyData });
    } catch (error) {
        console.error("Error in /property endpoint:", error.message);
        return res.status(500).json({
            error: "Failed to fetch property data.",
            details: error.response?.data || error.message,
        });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on https://skip-tracing.onrender.com`));
