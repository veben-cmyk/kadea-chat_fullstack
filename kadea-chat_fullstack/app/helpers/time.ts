import { DateTime } from 'luxon'

// Les dates arrivent de la base en UTC : on les convertit dans ce fuseau avant de les afficher
const ZONE = 'Africa/Kinshasa'

/**
 * Pour la sidebar : "14:32" si le message date d'aujourd'hui, sinon "12/10"
 */
export function formatTimeLabel(date: DateTime) {
  const local = date.setZone(ZONE)
  // On compare avec "maintenant" dans le MÊME fuseau, sinon "aujourd'hui"
  // peut être faux entre minuit et 1 h
  const now = DateTime.now().setZone(ZONE)

  return local.hasSame(now, 'day') ? local.toFormat('HH:mm') : local.toFormat('dd/MM')
}

/**
 * Pour les bulles de message : toujours l'heure, ex "14:32"
 */
export function formatMessageTime(date: DateTime) {
  return date.setZone(ZONE).toFormat('HH:mm')
}