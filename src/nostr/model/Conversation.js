import {NoteOrder} from '../store/NoteStore'

export default class Conversation {
  constructor(parties) {
    this.parties = parties.sort()
    this.messages = []
  }

  addMessage(message) {
    let newMessages = [...this.messages, message]
    newMessages.sort(NoteOrder.CREATION_DATE_ASC)
    return newMessages
  }

  get latestMessage() {
    return this.messages[this.messages.length - 1]
  }
}
