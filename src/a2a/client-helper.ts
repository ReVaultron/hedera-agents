import { A2AClient } from "@a2a-js/sdk/client";
import { Message, MessageSendParams } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

export class A2AClientHelper {
  static async sendMessage(
    agentCardUrl: string,
    messageText: string,
    additionalData?: Record<string, any>
  ): Promise<any> {
    try {
      const client = await A2AClient.fromCardUrl(agentCardUrl);

      const sendParams: MessageSendParams = {
        message: {
          messageId: uuidv4(),
          role: "user",
          parts: [
            {
              kind: "text",
              text: JSON.stringify({
                message: messageText,
                ...additionalData,
              }),
            },
          ],
          kind: "message",
        },
      };

      const response = await client.sendMessage(sendParams);

      if ("error" in response) {
        throw new Error(response.error.message);
      }

      const result = response.result as Message;
      return JSON.parse(result.parts[0].text || "{}");
    } catch (error) {
      console.error(`Error communicating with agent at ${agentCardUrl}:`, error);
      throw error;
    }
  }
}
