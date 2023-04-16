import {defineStore} from 'pinia'
import Message from 'src/nostr/model/Message'
import Conversation from 'src/nostr/model/Conversation'
import DateUtils from 'src/utils/DateUtils'

export const useMessageStore = defineStore('message', {
  state: () => ({
    messages: {}, // id -> message
    conversationsArray: [], // [conversation]
    conversationsMap: {}, // self -> counterparty -> conversation
  }),
  getters: {
    // TODO: update logic to fetch incognito conversations
    getConversations(state) {
      return pubkey => {
        const conversations = []
        for (const conv of this.conversationsArray) {
          const pubkeyIndex = conv.parties.indexOf(pubkey)
          if (pubkeyIndex === -1) {
            continue
          }

          const counterparty = conv.parties[1 - pubkeyIndex]
          const lastRead = useMessageStatusStore().getLastRead(pubkey, counterparty)
          const numUnread = conv.messages.filter(msg => msg.createdAt > lastRead && msg.author === counterparty).length
          conversations.push({
            pubkey: counterparty,
            latestMessage: conv.latestMessage,
            numUnread
          })
        }
        conversations.sort((a, b) => b.latestMessage?.createdAt - a.latestMessage?.createdAt)
        return conversations
      }
    },
    getConversation(state) {
      return (pubkey, counterparty) => state.conversationsMap[pubkey]?.[counterparty]?.messages || []
    },
    getNumUnread() {
      // TODO improve performance
      return pubkey => this.getConversations(pubkey).reduce((sum, conv) => sum + conv.numUnread, 0)
    },
  },
  actions: {
    addEvent(event) {
      const message = Message.from(event)
      if (!message) return false

      if (this.messages[message.id]) return this.messages[message.id]
      this.messages[message.id] = message

      if (!this.conversationsMap[message.author]) {
        this.conversationsMap[message.author] = {}
      }
      if (!this.conversationsMap[message.recipient]) {
        this.conversationsMap[message.recipient] = {}
      }
      const byAuthor = this.conversationsMap[message.author]
      const byRecipient = this.conversationsMap[message.recipient]

      let conversation = byAuthor[message.recipient]
      if (!conversation) {
        conversation = new Conversation([message.author, message.recipient])
        byAuthor[message.recipient] = conversation
        byRecipient[message.author] = conversation
        this.conversationsArray.push(conversation)
      }
      conversation.messages = conversation.addMessage(message)
      return message
    },
    markAsRead(pubkey, counterparty) {
      return useMessageStatusStore().markAsRead(pubkey, counterparty)
    },
    markAllAsRead(pubkey) {
      const store = useMessageStatusStore()
      for (const counterparty in (this.conversationsMap[pubkey] || {})) {
        store.markAsRead(pubkey, counterparty)
      }
    },
  }
})

const useMessageStatusStore = defineStore('message-status', {
  state: () => ({
    lastRead: {} // recipient -> sender -> lastReadTimestamp
  }),
  getters: {
    getLastRead(state) {
      return (pubkey, counterparty) => state.lastRead[pubkey]?.[counterparty] || 0
    }
  },
  actions: {
    markAsRead(pubkey, counterparty) {
      if (!this.lastRead[pubkey]) {
        this.lastRead[pubkey] = {}
      }
      this.lastRead[pubkey][counterparty] = DateUtils.now()
    },
  },
  persist: true
})
