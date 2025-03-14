const express = require("express");
const { sendCheckoutNotification } = require("../notifier/checkoutNotifier");

class ExpressServer {
    constructor(client) {
        this.client = client;
        this.app = express();
        this.app.use(express.json());
        this.setupRoutes();
    }

    setupRoutes() {
        this.app.post("/notify-checkout", async (req, res) => {
            const { discord_user_id, admin_name } = req.body;

            if (!discord_user_id || !admin_name) {
                return res.status(400).json({ message: "Missing required fields." });
            }

            const result = await sendCheckoutNotification(this.client, discord_user_id, admin_name);
            const status = result.success ? 200 : 500;

            res.status(status).json({ message: result.message });
        });
    }

    start(port = 3000) {
        this.app.listen(port, () => console.log(`Server running on port ${port}`));
    }
}

module.exports = ExpressServer;