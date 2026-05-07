declare module 'africastalking' {
  type AfricasTalkingConfig = {
    apiKey: string;
    username: string;
  };

  type SmsRecipient = {
    status?: string;
    messageId?: string;
  };

  type SmsSendResult = {
    SMSMessageData?: {
      Recipients?: SmsRecipient[];
    };
  };

  type AfricasTalkingClient = {
    SMS: {
      send(options: Record<string, unknown>): Promise<SmsSendResult>;
    };
  };

  function AfricasTalking(config: AfricasTalkingConfig): AfricasTalkingClient;

  export = AfricasTalking;
}
