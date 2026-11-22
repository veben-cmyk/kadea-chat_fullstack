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
      (isMine ? 'bg-brand-600 text-white' : 'border border-line bg-surface text-ink')

    // Dans un groupe, on affiche le nom de l'expéditeur au-dessus des messages des autres
    if (!isMine && isGroup && message.senderName) {
      const name = document.createElement('p')
      name.className = 'mb-0.5 text-xs font-bold text-link'
      name.textContent = message.senderName
      bubble.append(name)
    }

    const text = document.createElement('p')
    text.className = 'whitespace-pre-wrap break-words'
    text.dataset.messageText = ''
    text.textContent = message.content

    const time = document.createElement('p')
    time.className = 'mt-1 text-right text-[10px] ' + (isMine ? 'text-white/70' : 'text-muted')
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

    // Un message vient d'être supprimé par son auteur : on transforme la bulle sur place
  function markDeleted(id) {
    const row = list.querySelector(`[data-message-id="${id}"]`)
    if (!row) return

    const text = row.querySelector('[data-message-text]')
    text.textContent = 'Ce message a été supprimé'
    text.classList.add('italic', 'opacity-70')
    row.querySelector('[data-delete-form]')?.remove()
  }

  // Connexion ouverte avec le serveur, puis abonnement au canal de CETTE conversation
  const transmit = new Transmit({ baseUrl: window.location.origin })
  const subscription = transmit.subscription(`conversations/${conversationId}`)

  // À chaque message diffusé par le serveur (transmit.broadcast), on ajoute la bulle
  subscription.onMessage((message) => {
    if (message.isDeleted) {
      markDeleted(message.id)
      return
    }
    addMessage(message)
  })

  // Demande l'abonnement : c'est là que le "videur" (transmit.authorize) vérifie que tu es membre
  subscription.create()
  .catch((error) => console.error('Abonnement au temps réel impossible :', error))
    // --- Envoi d'un message sans recharger la page ---
  // On retrouve le formulaire grâce à l'étiquette posée à l'étape 1
  const messageForm = document.querySelector('[data-message-form]')
  // Le champ texte : son name="content" est celui que lit le contrôleur
  const messageInput = messageForm.querySelector('input[name="content"]')

    messageForm.addEventListener('submit', async (event) => {
    // Sans cette ligne, le navigateur enverrait le formulaire "à l'ancienne"
    // et rechargerait toute la page. C'est LA ligne clé de la fonctionnalité.
    event.preventDefault()

    // Message vide (ou seulement des espaces) : on n'envoie rien
    if (!messageInput.value.trim()) return

    // event.submitter = le bouton qui a déclenché l'envoi (le bouton "Envoyer")
    const sendButton = event.submitter

        // FormData lit TOUS les champs du formulaire : le texte (content)
    // ET le jeton de sécurité _csrf ajouté par {{ csrfField() }}.
    // Sans ce jeton, Adonis refuserait la requête (erreur 403).
    const data = new FormData(messageForm)

    // On désactive le bouton pendant l'envoi : pas de double envoi si on clique deux fois
    if (sendButton) sendButton.disabled = true

    try {
      // fetch envoie la requête SANS quitter la page.
      // form.action contient déjà la bonne adresse : /chat/12/messages
      const response = await fetch(messageForm.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })

      // response.ok = vrai si le serveur a répondu "tout va bien" (codes 200 à 299)
      if (!response.ok) throw new Error('Le serveur a répondu ' + response.status)

      // Succès : on vide le champ. Pas besoin de créer la bulle ici :
      // le serveur fait transmit.broadcast, et TON navigateur reçoit le message
      // comme les autres, puis addMessage() l'affiche.
      messageInput.value = ''
    } catch (error) {
      console.error("Envoi du message impossible :", error)
    } finally {
      // finally s'exécute dans TOUS les cas (succès ou erreur) :
      // on réactive le bouton et on remet le curseur dans le champ
      if (sendButton) sendButton.disabled = false
      messageInput.focus()
    }
  })
}

// --- Photo de profil : envoi direct à Cloudinary, puis enregistrement de l'adresse ---
const avatarInput = document.querySelector('[data-avatar-input]')

if (avatarInput) {
  // Vérifie que ce sont bien tes valeurs (tableau de bord Cloudinary).
  // Un "upload preset non signé" est fait pour être public : ce n'est pas un secret.
  const CLOUD_NAME = 'hze8r3qp'
  const UPLOAD_PRESET = 'veben2001'
  const MAX_SIZE = 5 * 1024 * 1024 // 5 Mo

  const status = document.querySelector('[data-avatar-status]')
  const showStatus = (text) => {
    status.textContent = text
    status.classList.remove('hidden')
  }

  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE) {
      showStatus('Photo trop lourde (5 Mo maximum).')
      return
    }

    showStatus('Envoi de la photo...')

    try {
      // FormData : le même format qu'un formulaire avec un champ fichier
      const data = new FormData()
      data.append('file', file)
      data.append('upload_preset', UPLOAD_PRESET)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: data,
      })
      if (!response.ok) throw new Error('Cloudinary a répondu ' + response.status)

      const result = await response.json()

      // On demande à Cloudinary une version carrée 256x256 centrée sur le visage :
      // la photo reste légère partout (liste des discussions, en-tête, profil).
      const squareUrl = result.secure_url.replace('/upload/', '/upload/c_fill,g_face,w_256,h_256,f_auto,q_auto/')

      document.querySelector('[data-avatar-url]').value = squareUrl
      document.getElementById('avatar-form').submit()
    } catch (error) {
      console.error('Envoi de la photo impossible :', error)
      showStatus("L'envoi a échoué. Réessaie avec une autre photo.")
    }
  })
  
}

// --- Mode sombre : chaque bouton [data-theme-toggle] bascule le thème et le mémorise ---
document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark')
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch (error) {}
  })
})

// --- Toasts (messages flash) : disparition automatique + bouton × ---
// Le conteneur [data-flash] n'existe que si le contrôleur a envoyé un message
// (voir ui/flash.edge). Sur toutes les autres pages, "flash" vaut null
// et ce bloc ne fait rien.
const flash = document.querySelector('[data-flash]')

if (flash) {
  // Fait disparaître le conteneur en douceur, puis le retire de la page.
  // 1. "opacity-0" lance le fondu (transition-opacity est déjà dans flash.edge)
  // 2. après 500 ms, la durée du fondu, on retire l'élément pour qu'il ne
  //    bloque plus les clics sur ce qui est en dessous
  const hideFlash = () => {
    flash.classList.add('opacity-0')
    setTimeout(() => flash.remove(), 500)
  }

  // Disparition automatique après 6 secondes
  const timer = setTimeout(hideFlash, 6000)

  // Bouton × : ferme SON toast tout de suite
  flash.querySelectorAll('[data-flash-close]').forEach((button) => {
    button.addEventListener('click', () => {
      // closest() remonte jusqu'au toast qui contient ce bouton
      button.closest('[data-toast]').remove()

      // S'il ne reste plus aucun toast, on retire aussi le conteneur
      // et on annule le minuteur, devenu inutile
      if (!flash.querySelector('[data-toast]')) {
        clearTimeout(timer)
        flash.remove()
      }
    })
  })
}