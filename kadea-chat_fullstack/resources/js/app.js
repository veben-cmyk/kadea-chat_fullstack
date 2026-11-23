import { Transmit } from '@adonisjs/transmit-client'

// app.js est chargé sur TOUTES les pages (login, accueil...). On ne fait rien
// s'il n'y a pas de liste de messages, c'est-à-dire hors d'une conversation ouverte.
const list = document.getElementById('messages')

// UNE seule connexion au temps réel pour toute la page, partagée par :
// - la conversation ouverte (canal "conversations/12")
// - la sidebar (canal personnel "users/5")
const transmit = new Transmit({ baseUrl: window.location.origin })

if (list) {
  // Les trois informations posées par show.edge
  const conversationId = list.dataset.conversationId
  const currentUserId = Number(list.dataset.currentUserId)
  const isGroup = list.dataset.isGroup === 'true'

  // Le formulaire d'envoi (étiquette data-message-form) et son jeton CSRF.
  // Le jeton servira aussi aux formulaires "Supprimer" des bulles créées en JavaScript.
  const messageForm = document.querySelector('[data-message-form]')
  const csrfToken = messageForm?.querySelector('input[name="_csrf"]')?.value ?? ''

  // Faire défiler la liste tout en bas (le dernier message visible)
  const scrollToBottom = () => {
    list.scrollTop = list.scrollHeight
  }
  scrollToBottom()

  // Les 3 icônes du menu, copiées de ui/icon.edge (mêmes dessins)
  const svg = (paths) =>
    `<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  const ICONS = {
    chevron: svg('<path d="m6 9 6 6 6-6" />'),
    copy: svg('<rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />'),
    trash: svg('<path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />'),
  }

  // Le menu d'actions d'une bulle : MÊME structure et mêmes classes que message_bubble.edge.
  // innerHTML est sans danger ICI : ce texte ne contient aucune donnée tapée par un
  // utilisateur (seulement nos balises, des numéros et le jeton). Le contenu du
  // message, lui, reste toujours mis avec textContent (voir createBubble).
  function menuHtml(message, isMine) {
    // Le bouton Supprimer n'existe que sur MES messages
    const deleteForm = isMine
      ? `<form data-delete-form method="POST"
           action="/chat/${conversationId}/messages/${message.id}/delete">
           <input type="hidden" name="_csrf" value="${csrfToken}">
           <button type="submit" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-danger hover:bg-danger/10">
            ${ICONS.trash} Supprimer
           </button>
         </form>`
      : ''

    return `
      <details data-message-menu class="absolute right-1 top-1">
        <summary class="flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-full bg-black/10 transition md:opacity-0 md:group-hover:opacity-100 [&::-webkit-details-marker]:hidden" aria-label="Actions sur le message">
          ${ICONS.chevron}
        </summary>
        <div class="absolute right-0 top-7 z-10 w-40 rounded-lg border border-line bg-surface p-1 text-sm text-ink shadow-lg">
          <button type="button" data-copy-message class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-page">
            ${ICONS.copy} Copier
          </button>
          ${deleteForm}
        </div>
      </details>`
  }

  // Fabrique UNE bulle : même structure et mêmes classes que message_bubble.edge
  function createBubble(message) {
    const isMine = message.senderId === currentUserId

    const row = document.createElement('div')
    row.dataset.messageId = message.id
    row.className = 'flex ' + (isMine ? 'justify-end' : 'justify-start')

    const bubble = document.createElement('div')
    // "group relative pr-9" : comme dans message_bubble.edge (survol + place de la flèche)
    bubble.className =
      'group relative pr-9 max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm md:max-w-[65%] ' +
      (isMine ? 'bg-brand-600 text-white' : 'border border-line bg-surface text-ink')

    // 1. Le menu en premier (comme dans le fichier Edge)
    bubble.innerHTML = menuHtml(message, isMine)

    // 2. Dans un groupe, le nom de l'expéditeur au-dessus des messages des autres
    if (!isMine && isGroup && message.senderName) {
      const name = document.createElement('p')
      name.className = 'mb-0.5 text-xs font-bold text-muted'
      name.textContent = message.senderName
      bubble.append(name)
    }

    // 3. Le texte. textContent (jamais innerHTML) : si quelqu'un envoie "<script>",
    // il s'affiche comme du texte au lieu de s'exécuter (protection XSS)
    const text = document.createElement('p')
    text.className = 'whitespace-pre-wrap break-words'
    text.dataset.messageText = ''
    text.textContent = message.content

    // 4. La ligne du bas : l'heure seulement (Supprimer est dans le menu)
    const meta = document.createElement('div')
    meta.className =
      'mt-1 flex items-center justify-end gap-2 text-[10px] ' + (isMine ? 'text-white/70' : 'text-muted')
    
    const time = document.createElement('span')
    time.textContent = message.timeLabel
    meta.append(time)

    // "lu" caché sur MES messages en discussion privée (comme dans message_bubble.edge).
    // Il apparaîtra quand l'autre lira (voir showReadLabels).
    if (isMine && !isGroup) {
      const readLabel = document.createElement('span')
      readLabel.dataset.readLabel = ''
      readLabel.className = 'hidden'
      readLabel.textContent = '· lu'
      meta.append(readLabel)
    }

    bubble.append(text, meta)
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
    // Un message supprimé n'a plus de menu (ni Copier, ni Supprimer)
    row.querySelector('[data-message-menu]')?.remove()
  }

    // Montre "· lu" sur tous mes messages encore marqués "non lu".
  // querySelectorAll('[data-read-label].hidden') = les "lu" qui sont encore cachés.
  function showReadLabels() {
    list.querySelectorAll('[data-read-label].hidden').forEach((label) => {
      label.classList.remove('hidden')
    })
  }

  // Connexion ouverte avec le serveur, puis abonnement au canal de CETTE conversation
  // UNE seule connexion au temps réel pour toute la page, partagée par :
    // - la conversation ouverte (canal "conversations/12")
    // - la sidebar (canal personnel "users/5")
    const subscription = transmit.subscription(`conversations/${conversationId}`)

  // À chaque message diffusé par le serveur (transmit.broadcast), on ajoute la bulle
    subscription.onMessage((message) => {
    // NOUVEAU : un événement "quelqu'un a lu" n'est PAS un message.
    // Sans ce test, addMessage fabriquerait une bulle vide ! (L'étape C le traitera.)
        // Quelqu'un a lu la conversation
    if (message.type === 'read') {
      // Si c'est l'AUTRE personne (pas moi dans un autre onglet) : mes messages sont lus
      if (message.readerId !== currentUserId && !isGroup) showReadLabels()
      return
    }

    if (message.isDeleted) {
      markDeleted(message.id)
      return
    }
    addMessage(message)

    // NOUVEAU : le message vient de quelqu'un d'autre et je regarde la conversation :
    // je préviens le serveur que je l'ai lu
    if (message.senderId !== currentUserId) markConversationRead()
  })

  // Demande l'abonnement : c'est là que le "videur" (transmit.authorize) vérifie que tu es membre
  subscription.create()
  .catch((error) => console.error('Abonnement au temps réel impossible :', error))

    // --- "J'ai lu" : prévenir le serveur ---
  function markConversationRead() {
    // Onglet caché (autre onglet ouvert, fenêtre réduite) : je ne lis pas vraiment,
    // donc on ne dit rien au serveur
    if (document.visibilityState !== 'visible') return

    // Le jeton CSRF est obligatoire pour tout POST, même envoyé par fetch
    const body = new FormData()
    body.append('_csrf', csrfToken)

    fetch(`/chat/${conversationId}/read`, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
    }).catch((error) => console.error('Impossible de marquer comme lu :', error))
  }

  // Quand je REVIENS sur l'onglet de la conversation, j'ai lu ce qui est arrivé entre-temps
  document.addEventListener('visibilitychange', markConversationRead)

  // --- Envoi d'un message sans recharger la page ---
  const messageInput = messageForm.querySelector('input[name="content"]')

  messageForm.addEventListener('submit', async (event) => {
    // Sans cette ligne, le navigateur enverrait le formulaire "à l'ancienne"
    // et rechargerait toute la page
    event.preventDefault()

    // Message vide (ou seulement des espaces) : on n'envoie rien
    if (!messageInput.value.trim()) return

    // event.submitter = le bouton qui a déclenché l'envoi
    const sendButton = event.submitter

    // FormData lit le texte (content) ET le jeton _csrf du formulaire
    const data = new FormData(messageForm)

    // Pas de double envoi pendant que le message part
    if (sendButton) sendButton.disabled = true

    try {
      const response = await fetch(messageForm.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Le serveur a répondu ' + response.status)

      // Succès : on vide le champ. La bulle arrivera par Transmit (addMessage)
      messageInput.value = ''
    } catch (error) {
      console.error('Envoi du message impossible :', error)
    } finally {
      // Dans tous les cas : on réactive le bouton et on remet le curseur dans le champ
      if (sendButton) sendButton.disabled = false
      messageInput.focus()
    }
  })

  // --- Copier un message ---
  // Délégation d'événement : UN seul écouteur sur toute la liste, au lieu d'un par bulle.
  // Avantage : ça marche aussi pour les bulles ajoutées plus tard en temps réel.
  list.addEventListener('click', async (event) => {
    // closest() remonte depuis l'élément cliqué (peut-être l'icône) jusqu'au bouton Copier
    const copyButton = event.target.closest('[data-copy-message]')
    if (!copyButton) return // le clic n'était pas sur "Copier"

    // On remonte jusqu'à la bulle, puis on lit son texte
    const row = copyButton.closest('[data-message-id]')
    const text = row.querySelector('[data-message-text]').textContent

    try {
      // Le presse-papiers du système (marche sur localhost et en https)
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Copie impossible :', error)
    }

    // On referme le menu : <details> se ferme quand open passe à false
    copyButton.closest('details').open = false
  })

  // --- Fermer le menu ouvert quand on clique ailleurs ---
  // <details> ne se referme pas tout seul si on clique à côté : on s'en charge.
  document.addEventListener('click', (event) => {
    list.querySelectorAll('details[data-message-menu][open]').forEach((menu) => {
      // Le clic a eu lieu en dehors de CE menu : on le ferme
      if (!menu.contains(event.target)) menu.open = false
    })
  })

    // --- Supprimer un message avec la fenêtre de confirmation ---
  const deleteDialog = document.getElementById('delete-dialog')
  // Le formulaire "Supprimer" qui attend la réponse de la fenêtre
  let pendingDeleteForm = null

  // 1. Clic sur "Supprimer" dans un menu.
  // L'événement "submit" remonte jusqu'à la liste : délégation, comme pour Copier.
  list.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-delete-form]')
    if (!form) return // ce n'est pas un formulaire de suppression

    event.preventDefault() // pas d'envoi "à l'ancienne", donc pas de rechargement
    pendingDeleteForm = form // on le garde de côté le temps de la confirmation
    form.closest('details').open = false // on referme le petit menu

    // On efface la réponse précédente AVANT d'ouvrir : sinon, si on ferme avec Échap,
    // returnValue garderait l'ancien 'confirm' et supprimerait sans le vouloir
    deleteDialog.returnValue = ''
    deleteDialog.showModal() // ouvre la fenêtre au centre, fond assombri
  })

  // 2. La fenêtre vient de se fermer (Annuler, Supprimer ou touche Échap)
  deleteDialog.addEventListener('close', async () => {
    const form = pendingDeleteForm
    pendingDeleteForm = null

    // returnValue = la "value" du bouton cliqué. Tout sauf 'confirm' = on ne fait rien.
    if (deleteDialog.returnValue !== 'confirm' || !form) return

    // On retient la bulle maintenant : markDeleted retirera le menu (et donc le formulaire)
    const row = form.closest('[data-message-id]')

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form), // contient le jeton _csrf
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Le serveur a répondu ' + response.status)

      // Transmit préviendra aussi tout le monde, mais on met à jour MA bulle tout de suite
      markDeleted(row.dataset.messageId)
    } catch (error) {
      console.error('Suppression impossible :', error)
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

// --- Bannière "connexion perdue" ---
// La bannière #offline-banner est dans layouts/app.edge : elle existe sur toutes
// les pages de l'appli (chat, profil...), donc ce bloc est HORS du "if (list)".
const offlineBanner = document.getElementById('offline-banner')

if (offlineBanner) {
  // Affiche ou cache la bannière selon l'état du réseau.
  // classList.toggle('hidden', condition) :
  //   - condition vraie -> ajoute "hidden" (bannière cachée)
  //   - condition fausse -> retire "hidden" (bannière visible)
  // Ici : connecté (navigator.onLine = true) -> cachée ; hors ligne -> visible.
  const updateOfflineBanner = () => {
    offlineBanner.classList.toggle('hidden', navigator.onLine)
  }

  // Le navigateur prévient quand la connexion tombe ou revient
  window.addEventListener('offline', updateOfflineBanner)
  window.addEventListener('online', updateOfflineBanner)

  // Et on vérifie une première fois au chargement de la page
  // (au cas où la page s'ouvre alors qu'on est déjà hors ligne)
  updateOfflineBanner()
}

// --- Sidebar en temps réel ---
// [data-sidebar] est dans layouts/app.edge : présent sur toutes les pages de l'appli.
const sidebar = document.querySelector('[data-sidebar]')

if (sidebar) {
  const me = Number(sidebar.dataset.currentUserId)
  // La conversation ouverte en ce moment (0 si on est sur la liste ou le profil).
  // list?.dataset : le "?." évite une erreur quand list n'existe pas sur la page.
  const openConversationId = Number(list?.dataset.conversationId ?? 0)

  // Met à jour UNE ligne de la sidebar à partir de la "note" envoyée par le serveur
  function updateSidebarItem(note) {
    const item = sidebar.querySelector(`[data-conversation-item="${note.conversationId}"]`)

    // Conversation absente de la liste (quelqu'un m'écrit pour la toute première fois) :
    // on ne fait rien ici, elle apparaîtra au prochain chargement de page
    if (!item) return

    // 1. Le nouvel aperçu et la nouvelle heure
    item.querySelector('[data-preview]').textContent = note.preview
    item.querySelector('[data-time]').textContent = note.timeLabel

    // 2. La conversation remonte en haut de la liste.
    // prepend() DÉPLACE l'élément au début de son parent (il n'est pas copié).
    item.parentElement.prepend(item)

    // 3. Pastille +1 : seulement si le message vient de quelqu'un d'AUTRE
    // et que je ne suis pas déjà en train de lire CETTE conversation
    const fromSomeoneElse = note.senderId !== me
    const isOpen = note.conversationId === openConversationId

    if (fromSomeoneElse && !isOpen) {
      const badge = item.querySelector('[data-unread-badge]')
      // Le chiffre affiché est du texte : Number() le convertit avant d'ajouter 1
      badge.textContent = Number(badge.textContent || 0) + 1
      badge.classList.remove('hidden')
    }
  }

  // Abonnement à MON canal personnel. Le "videur" (transmit.authorize 'users/:id')
  // vérifie que c'est bien le mien.
  const userChannel = transmit.subscription(`users/${me}`)
  userChannel.onMessage(updateSidebarItem)
  userChannel.create()
    .catch((error) => console.error('Sidebar en temps réel impossible :', error))
}