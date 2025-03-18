require("dotenv").config();
const { Client, GatewayIntentBits, ActivityType, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require("discord.js");
const fs = require("fs");
const ReminderService = require("./reminder/reminderService");
const ButtonHandler = require("./buttonHandler/ButtonHandler");
const ExpressServer = require("./server/expressServer");

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
    try {
        // Handle Command Interactions First
        if (interaction.isCommand()) {
            if (interaction.commandName === "full-reset") {
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
                return; // Add this to prevent further code execution
            }
        }

        // Handle Button Interactions Afterward
        if (interaction.isButton()) {
            await buttonHandler.handleInteraction(interaction);
        }
    } catch (error) {
        console.error('Interaction Error:', error);
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: "❌ Something went wrong.", ephemeral: true });
        } else {
            await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true });
        }
    }
});

client.once("ready", async () => {
    console.log(`Bot is online! Logged in as ${client.user.tag}`);

    client.user.setPresence({
        activities: [{ name: 'time tracking', type: ActivityType.Watching }],
        status: 'online',
    });

    const reminderService = new ReminderService(client);
    reminderService.scheduleReminders();

    const server1 = new ExpressServer(client);
    server1.start();

    // Register Slash Commands
    const commands = [
        new SlashCommandBuilder()
            .setName('full-reset')
            .setDescription('Deletes all DMs between you and the bot after confirmation.')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log("Refreshing slash commands...");
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log("Slash commands successfully registered!");
    } catch (error) {
        console.error("Error registering slash commands:", error);
    }
});

client.login(TOKEN)
    .then(() => console.log("Login successful"))
    .catch(error => console.error("Login failed:", error));