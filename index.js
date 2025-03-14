require("dotenv").config();
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const fs = require("fs");
const ReminderService = require("./reminder/reminderService");
const ButtonHandler = require("./buttonHandler/ButtonHandler");
const ExpressServer = require("./server/expressServer")

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

const buttonHandler = new ButtonHandler();
const TOKEN = process.env.DISCORD_TOKEN;

client.on("interactionCreate", async interaction => {
    await buttonHandler.handleInteraction(interaction);
});

client.once("ready", () => {
    console.log(`Bot is online! Logged in as ${client.user.tag}`);
    
    client.user.setPresence({
        activities: [{ name: 'time tracking', type: ActivityType.Watching }],
        status: 'online',
    });
    
    const reminderService = new ReminderService(client);
    reminderService.scheduleReminders();
    
    const server1 = new ExpressServer(client);
    server1.start();
});

client.login(TOKEN)
    .then(() => console.log("Login successful"))
    .catch(error => console.error("Login failed:", error));