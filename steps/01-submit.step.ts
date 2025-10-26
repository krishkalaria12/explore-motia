import { ApiRouteConfig, Handlers } from "motia";
import { v4 as uuidv4 } from 'uuid';

// step 1 -> accepting channel name and email to start the workflow
export const config: ApiRouteConfig = {
    name: "SubmitChannel",
    type: "api",
    path: "/submit",
    method: "POST",
    emits: ["yt.submit"]
}

interface SubmitChannel {
    channel: string;
    email: string;
}

export const handler: Handlers['SubmitChannel'] = async(req, { emit, logger, state }) => {
    try {
        logger.info("Received submission request: ", {
            body: req.body
        })
        const { channel, email } = req.body as SubmitChannel;
        
        if (!channel || !email) {
            return {
                status: 400,
                body: {
                    error: "Missing required fields"
                }
            }
        }

        const jobId = `job_${uuidv4()}`

        await state.set(`job: ${jobId}`, {
            jobId,
            channel,
            email,
            status: "queued",
            createdAt: new Date().toISOString()
        })

        logger.info(
            "Job created!",
            {
                jobId,
                channel,
                email
            }
        )

        await emit({
            topic: "yt.submit",
            data: {
                jobId,
                channel,
                email
            }
        });

        return {
            status: 202,
            body: {
                success: true,
                jobId,
                message: "your request has been qeueued, you will get an email soon with improved suggestion for your yt videos"
            }
        } 

    } catch (error) {
        logger.error("Error in the submission handler", {error: error.message});
        return {
            status: 500,
            body: {
                error: "Internal server error"
            }
        }
    }
}