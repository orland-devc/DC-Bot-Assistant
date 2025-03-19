const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const fs = require("fs");
const cron = require("node-cron");

class ReminderService {
    constructor(client) {
        this.client = client;
        this.logDirectory = process.env.LOG_DIRECTORY || "./logs";
        this.timeInApi = process.env.URL_API + '/time-in';
        this.timeOutApi = process.env.URL_API + '/time-out';
    }

    readJSONFile(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading ${filePath}:`, error);
            return [];
        }
    }

    getUsers() {
        const clients = this.readJSONFile('./users/clients.json');
        const employees = this.readJSONFile('./users/employee.json');
        return [...clients, ...employees];
        // return [...employees];
    }

    createButton(id, label, style, emoji) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(id)
                .setLabel(label)
                .setStyle(style)
                .setEmoji(emoji)
        );
    }

    async sendReminder(users, title, description, color, button) {
        for (const user of users) {
            try {
                const discordUser = await this.client.users.fetch(user.discord_id);
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

    async sendTimeInReminder() {
        await this.sendReminder(
            this.getUsers(), 
            "⏰ Time-In Reminder", 
            "Don't forget to record your time-in! Click the button below.", 
            "#00FF00", 
            this.createButton('time-in', 'Time In', ButtonStyle.Success, '🕒')
        );
    }

    async sendTimeOutReminder() {
        await this.sendReminder(
            this.getUsers(), 
            "⏰ Time-Out Reminder", 
            "Don't forget to record your time-out! Click the button below.", 
            "#FFA500", 
            this.createButton('time-out', 'Time Out', ButtonStyle.Danger, '⏱️')
        );
    }

    scheduleReminders() {
        cron.schedule('28 10 * * *', () => this.sendTimeInReminder());
        // cron.schedule('0 8 * * *', () => this.sendTimeInReminder());
        // cron.schedule('30 13 * * *', () => this.sendTimeOutReminder());
        // cron.schedule('0 17 * * *', () => this.sendTimeOutReminder());
        console.log("Reminders scheduled successfully");
    }
}

module.exports = ReminderService;