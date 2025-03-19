async function sendCheckoutNotification(client, discordUserId, adminName) {
    try {
        const user = await client.users.fetch(discordUserId);
        const now = new Date();
        const formattedTime = now.toLocaleString('en-US', { 
            month: 'long', day: 'numeric', 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });

        const message = `📢 **${adminName}** checked out **${user.displayName}** at **${formattedTime}**.`;

        const guild = await client.guilds.fetch(process.env.SERVER_ID);
        const channel = await guild.channels.fetch(process.env.CHANNEL_ID);

        if (channel && channel.isTextBased()) {
            await channel.send(message);
            return { success: true, message: "Notification sent successfully." };
        } else {
            console.error("❌ Channel not found or is not text-based.");
            return { success: false, message: "Channel not found or invalid." };
        }
    } catch (error) {
        console.error("❌ Error sending checkout notification:", error);
        return { success: false, message: "Failed to send notification." };
    }
}

module.exports = { sendCheckoutNotification };
