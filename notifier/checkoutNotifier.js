const { EmbedBuilder } = require("discord.js");

async function sendCheckoutNotification(client, discord_user_id, admin_name) {
    try {
        const user = await client.users.fetch(discord_user_id);

        if (user) {
            const embed = new EmbedBuilder()
                .setTitle("✅ Time-Out Notification")
                .setDescription(`${admin_name} checked you out. Time in closed.`)
                .setColor("#FFA500")
                .setTimestamp();

            await user.send({ embeds: [embed] });
            console.log(`Checkout notification sent to ${user.tag}`);
            return { success: true, message: "DM sent successfully!" };
        }

        console.log(`User with ID ${discord_user_id} not found.`);
        return { success: false, message: "User not found." };

    } catch (error) {
        console.error(`Failed to send checkout notification:`, error);
        return { success: false, message: "Failed to send DM." };
    }
}

module.exports = { sendCheckoutNotification };
