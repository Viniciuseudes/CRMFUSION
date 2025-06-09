"use client"

import { useState } from "react"
import { Bell, X, AlertTriangle, Info, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const notifications = [
  {
    id: 1,
    type: "warning",
    title: "Reserva pendente de confirmação",
    message: "Dr. João Silva - Sala 101 - Hoje 14:00",
    time: "5 min atrás",
  },
  {
    id: 2,
    type: "info",
    title: "Novo lead cadastrado",
    message: "Dra. Maria Santos - Cardiologia",
    time: "15 min atrás",
  },
  {
    id: 3,
    type: "success",
    title: "Pagamento confirmado",
    message: "Reserva #1234 - R$ 150,00",
    time: "1 hora atrás",
  },
]

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notificationList, setNotificationList] = useState(notifications)

  const removeNotification = (id: number) => {
    setNotificationList((prev) => prev.filter((n) => n.id !== id))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {notificationList.length > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
              {notificationList.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h4 className="font-semibold">Notificações</h4>
          <Badge variant="secondary">{notificationList.length}</Badge>
        </div>
        <div className="max-h-80 overflow-auto">
          {notificationList.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
          ) : (
            notificationList.map((notification) => (
              <div key={notification.id} className="border-b p-4 hover:bg-muted/50">
                <div className="flex items-start gap-3">
                  {getIcon(notification.type)}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeNotification(notification.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
