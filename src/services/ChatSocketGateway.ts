export class ChatSocketGateway {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) return;

    console.log('Chat socket gateway initialized');
    this.initialized = true;
  }
}

export default ChatSocketGateway;
