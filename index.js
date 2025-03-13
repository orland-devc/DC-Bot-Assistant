require("dotenv").config();
const express = require("express");
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder 
} = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const { sendCheckoutNotification } = require("./checkoutNotifier");

const TOKEN = process.env.DISCORD_TOKEN;
const TIME_IN_API = process.env.URL_API + '/time-in';
const TIME_OUT_API = process.env.URL_API + '/time-out';
const LOG_DIRECTORY = process.env.LOG_DIRECTORY || "./logs";

if (!fs.existsSync(LOG_DIRECTORY)) {
    fs.mkdirSync(LOG_DIRECTORY, { recursive: true });
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
});

const app = express();
app.use(express.json());

app.post("/notify-checkout", async (req, res) => {
    const { discord_user_id, admin_name } = req.body;

    if (!discord_user_id || !admin_name) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    const result = await sendCheckoutNotification(client, discord_user_id, admin_name);
    const status = result.success ? 200 : 500;

    res.status(status).json({ message: result.message });
});

app.listen(3000, () => console.log("Server running on port 3000"));

function readJSONFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
}

function getUsers() {
    const clients = readJSONFile('./users/clients.json');
    const employees = readJSONFile('./users/employee.json');

    return [...clients,...employees];
}

function createButton(id, label, style, emoji) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(style)
            .setEmoji(emoji)
    );
}

async function sendReminder(users, title, description, color, button) {
    for (const user of users) {
        try {
            const discordUser = await client.users.fetch(user.discord_id);
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .setTimestamp();

            await discordUser.send({ embeds: [embed], components: [button] });
            console.log(`${title} sent to ${user.name} (${user.discord_id})`);
        } catch (error) {
            console.error(`Failed to send ${title} to ${user.discord_id}:`, error);
        }
    }
}

async function sendTimeInReminder() {
    await sendReminder(getUsers(), "⏰ Time-In Reminder", "Don't forget to record your time-in! Click the button below.", "#00FF00", createButton('time-in', 'Time In', ButtonStyle.Success, '🕒'));
}

async function sendTimeOutReminder() {
    await sendReminder(getUsers(), "⏰ Time-Out Reminder", "Don't forget to record your time-out! Click the button below.", "#FFA500", createButton('time-out', 'Time Out', ButtonStyle.Danger, '⏱️'));
}

function scheduleReminders() {
    cron.schedule('5 13 * * *', sendTimeInReminder);
    cron.schedule('0 8 * * *', sendTimeInReminder);
    cron.schedule('49 11 * * *', sendTimeOutReminder);
    cron.schedule('0 17 * * *', sendTimeOutReminder);
    console.log("Reminders scheduled successfully");
}

client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    const data = {
        discord_user_id: interaction.user.id,
        discord_username: interaction.user.displayName,
        discord_avatar: interaction.user.avatar,
        discord_discriminator: interaction.user.discriminator
    };

    const endpoint = interaction.customId === "time-in" ? TIME_IN_API : TIME_OUT_API;
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
        fs.appendFileSync(path.join(LOG_DIRECTORY, "attendance.log"), logMessage + "\n");

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
});

client.once("ready", () => {
    console.log(`Bot is online! Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: 'time tracking', type: ActivityType.Watching }],
        status: 'online',
    });
    scheduleReminders();
});

client.login(TOKEN)
    .then(() => console.log("Login successful"))
    .catch(error => console.error("Login failed:", error));
