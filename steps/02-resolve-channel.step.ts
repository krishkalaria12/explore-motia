import { EventConfig, Handlers } from "motia";

// step 2 -> convert yt handle/name to the channel id using yt data api
export const config: EventConfig = {
    name: "ResolveChannel",
    type: "event",
    subscribes: ["yt.submit"],
    emits: ["yt.channel.resolved", "yt.channel.error"]
};

export const handler: Handlers['SubmitChannel'] = async(eventData, { emit, logger, state }) => {
    let jobId: string  | undefined
    let email: string | undefined

    try {
        const data = eventData || {};
        jobId = data.jobId;
        email = data.email;
        const channel = data.channel;

        logger.info("Resolving yt channel", {
            jobId, channel
        });

        const yt_api_key = process.env.YOUTUBE_API_KEY;
        if (!yt_api_key) {
            throw new Error("youtube api key is not added");
        }

        const jobData = await state.get(`job: ${jobId}`);
        await state.set(`job: ${jobId}`, {
            ...jobData,
            status: "Resolving channel",
        })

        let channelId: string | null = null;
        let channelName: string = "";

        if (channel.startsWith('@')) {
            const handle = channel.substring(1);

            const searchUrl = `https://www.googleapis.com/
                youtube/v3/search?part=snippet&type=channel&q=${
                encodeURIComponent(
                    handle
                )}&key=${yt_api_key}`;

            const searchResponse = await fetch(searchUrl);
            const data = await searchResponse.json();

            if(data.items && data.items.length > 0) {
                channelId = data.items[0].snippet.channelId;
                channelName = data.items[0].snippet.title;
            }
        } else {
            const searchUrl = `https://www.googleapis.com/
                youtube/v3/search?part=snippet&type=channel&q=${
                encodeURIComponent(
                    channel
                )}&key=${yt_api_key}`;

            const searchResponse = await fetch(searchUrl);
            const data = await searchResponse.json();

            if(data.items && data.items.length > 0) {
                channelId = data.items[0].snippet.channelId;
                channelName = data.items[0].snippet.title;
            }
        }

        if (!channelId) {
            logger.error("Channel not found", {channel});
            await state.set(`job: ${jobId}`, {
                ...jobData,
                status: "Failed",
                error: "Channel not found"
            })
        }

        await emit({
            topic: "yt.channel.error",
            data: {
                jobId,
                email,
            }
        })

        return;

    } catch (error) {
        logger.error("Error resolving channel", {error: error.message});
        if (!jobId || !email) {
            logger.error("Cannot send notification - missing jobId or email");
            return;
        }

        const jobData = await state.get(`job: ${jobId}`);
        await state.set(`job: ${jobId}`, {
            ...jobData,
            status: "Failed",
            error: "error.message"
        })

        await emit({
            topic: "yt.channel.error",
            data: {
                jobId,
                email,
                error: "Failed to resolve the channel, please try again"
            }
        })
    }
}