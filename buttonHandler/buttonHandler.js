const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

class ButtonHandler {
    constructor() {
        this.logDirectory = process.env.LOG_DIRECTORY || "./logs";
        this.timeInApi = process.env.URL_API + '/time-in';
        this.timeOutApi = process.env.URL_API + '/time-out';
        this.serverId = process.env.SERVER_ID;
        this.channelId = process.env.CHANNEL_ID;
    }

    async handleInteraction(interaction) {
        if (!interaction.isButton()) return;

        if (interaction.customId === "full-reset") {
            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_full_reset')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_full_reset')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({
                content: "⚠️ Are you sure you want to delete all DMs with me? This action cannot be undone.",
                components: [confirmationRow],
                ephemeral: true
            });
            return;
        }

        if (interaction.customId === 'confirm_full_reset') {
            await interaction.update({ content: "🟠 Working on it...", components: [] });
            try {
                const dmChannel = await interaction.user.createDM();
                const messages = await dmChannel.messages.fetch({ limit: 100 });
                for (const message of messages.values()) {
                    if (message.author.id === interaction.client.user.id) {
                        await message.delete().catch(() => {});
                    }
                }
                await interaction.followUp({ content: "✅ All DMs with me have been deleted.", ephemeral: true });
            } catch (error) {
                console.error("Error clearing DMs:", error);
                await interaction.followUp({ content: "❌ Failed to delete DMs.", ephemeral: true });
            }
            return;
        }

        if (interaction.customId === 'cancel_full_reset') {
            await interaction.update({ content: "❌ Deletion canceled.", components: [] });
            return;
        }

        const data = {
            discord_user_id: interaction.user.id,
            discord_username: interaction.user.displayName,
            discord_avatar: interaction.user.avatar,
            discord_discriminator: interaction.user.discriminator
        };

        const endpoint = interaction.customId === "time-in" ? this.timeInApi : this.timeOutApi;
        const action = interaction.customId === "time-in" ? "Timed-In" : "Timed-Out";

        await interaction.deferReply({ ephemeral: true });

        try {
            const response = await axios.post(endpoint, data);
            const embed = new EmbedBuilder()
                .setTitle(`✅ ${action} Recorded`)
                .setDescription(response.data.message)
                .setColor(action === "Timed-In" ? "#00FF00" : "#FFA500")
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], ephemeral: true });

            const logMessage = `${new Date().toISOString()} - ${action}: ${data.discord_username} (${data.discord_user_id})`;
            fs.appendFileSync(path.join(this.logDirectory, "attendance.log"), logMessage + "\n");

            // Notify Channel instead of DM
            const guild = await interaction.client.guilds.fetch(this.serverId);
            const channel = await guild.channels.fetch(this.channelId);

            if (channel && channel.isTextBased()) {
                const now = new Date();
                const formattedTime = now.toLocaleString('en-US', { 
                    month: 'long', day: 'numeric', 
                    hour: 'numeric', minute: '2-digit', hour12: true 
                });
                await channel.send(`📢 **${data.discord_username}** ${action.toLowerCase()} at **${formattedTime}**.`);
            } else {
                console.error("❌ Channel not found or is not text-based.");
            }

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
