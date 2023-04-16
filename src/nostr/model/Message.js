import {EventKind} from 'src/nostr/model/Event'

export default class Message {
  constructor(id, args) {
    this.id = id
    this.author = args.author || args.pubkey
    this.recipient = args.recipient
    this.createdAt = args.createdAt
    this.content = args.content || ''
    this.tags = args.tags
    this.ancestor = args.ancestor
    this.plaintext = args.plaintext
  }

  static from(event) {
    console.assert(event.kind === EventKind.DM)
    const recipients = event.pubkeyRefs()
    if (!recipients || !recipients.length) return

    const ancestor = event.eventRefs().ancestor()
    return new Message(event.id, {
      author: event.pubkey,
      createdAt: event.createdAt,
      content: event.content,
      tags: event.tags,
      recipient: recipients[0],
      ancestor,
    })
  }

  cachePlaintext(plaintext) {
    this.plaintext = plaintext
  }
}
