import { Transmit } from '@adonisjs/transmit-client'

// app.js est chargé sur TOUTES les pages (login, accueil...). On ne fait rien
// s'il n'y a pas de liste de messages, c'est-à-dire hors d'une conversation ouverte.
const list = document.getElementById('messages')

if (list) {
  // Les trois informations posées par show.edge
  const conversationId = list.dataset.conversationId
  const currentUserId = Number(list.dataset.currentUserId)
  const isGroup = list.dataset.isGroup === 'true'

  // Faire défiler la liste tout en bas (le dernier message visible)
  const scrollToBottom = () => {
    list.scrollTop = list.scrollHeight
  }
  scrollToBottom()

  // Fabrique UNE bulle : même structure et mêmes classes que message_bubble.edge
  function createBubble(message) {
    const isMine = message.senderId === currentUserId

    const row = document.createElement('div')
    row.dataset.messageId = message.id
    row.className = 'flex ' + (isMine ? 'justify-end' : 'justify-start')

    const bubble = document.createElement('div')
    bubble.className =
      'max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm md:max-w-[65%] ' +
      (isMine ? 'bg-brand-600 text-white' : 'border border-brand-100 bg-white text-brand-950')

    // Dans un groupe, on affiche le nom de l'expéditeur au-dessus des messages des autres
    if (!isMine && isGroup && message.senderName) {
      const name = document.createElement('p')
      name.className = 'mb-0.5 text-xs font-bold text-brand-600'
      name.textContent = message.senderName
      bubble.append(name)
    }

    const text = document.createElement('p')
    text.className = 'whitespace-pre-wrap break-words'
    // textContent (et pas innerHTML) : si quelqu'un envoie "<script>", il s'affiche
    // comme du texte au lieu de s'exécuter. C'est l'équivalent des 2 accolades d'Edge.
    text.textContent = message.content

    const time = document.createElement('p')
    time.className = 'mt-1 text-right text-[10px] ' + (isMine ? 'text-white/70' : 'text-brand-400')
    time.textContent = message.timeLabel

    bubble.append(text, time)
    row.append(bubble)
    return row
  }

  // Ajoute une bulle à la liste
  function addMessage(message) {
    // Déjà affichée ? On ne la remet pas.
    if (list.querySelector(`[data-message-id="${message.id}"]`)) return

    // Premier message : on retire "Aucun message pour l'instant"
    list.querySelector('[data-empty-state]')?.remove()

    list.append(createBubble(message))
    scrollToBottom()
  }

  // Connexion ouverte avec le serveur, puis abonnement au canal de CETTE conversation
  const transmit = new Transmit({ baseUrl: window.location.origin })
  const subscription = transmit.subscription(`conversations/${conversationId}`)

  // À chaque message diffusé par le serveur (transmit.broadcast), on ajoute la bulle
  subscription.onMessage((message) => {
    addMessage(message)
  })

  // Demande l'abonnement : c'est là que le "videur" (transmit.authorize) vérifie que tu es membre
  subscription.create()
  .catch((error) => console.error('Abonnement au temps réel impossible :', error))
}