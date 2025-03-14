const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

class ButtonHandler {
    constructor() {
        this.logDirectory = process.env.LOG_DIRECTORY || "./logs";
        this.timeInApi = process.env.URL_API + '/time-in';
        this.timeOutApi = process.env.URL_API + '/time-out';
    }

    async handleInteraction(interaction) {
        if (!interaction.isButton()) return;

        const data = {
            discord_user_id: interaction.user.id,
            discord_username: interaction.user.displayName,
            discord_avatar: interaction.user.avatar,
            discord_discriminator: interaction.user.discriminator
        };

        const endpoint = interaction.customId === "time-in" ? this.timeInApi : this.timeOutApi;
        const action = interaction.customId === "time-in" ? "Time-In" : "Time-Out";

        await interaction.deferReply({ ephemeral: true });

        try {
            const response = await axios.post(endpoint, data);
            const embed = new EmbedBuilder()
                .setTitle(`✅ ${action} Recorded`)
                .setDescription(response.data.message)
                .setColor(action === "Time-In" ? "#00FF00" : "#FFA500")
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], ephemeral: true });

            const logMessage = `${new Date().toISOString()} - ${action}: ${data.discord_username} (${data.discord_user_id})`;
            fs.appendFileSync(path.join(this.logDirectory, "attendance.log"), logMessage + "\n");

        } catch (error) {
            console.error(`${action} API error:`, error.response?.data || error.message);
            const errorMessage = error.response?.data?.message || `Failed to record ${action.toLowerCase()}.`;
            const embed = new EmbedBuilder()
                .setTitle(`❌ ${action} Failed`)
                .setDescription(errorMessage)
                .setColor("#FF0000")
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        }
    }
}

module.exports = ButtonHandler;