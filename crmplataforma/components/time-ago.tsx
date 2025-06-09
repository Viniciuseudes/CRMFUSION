// CRMTESTE/TESTEPlataforma/components/time-ago.tsx
"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimeAgoProps {
  date: string | Date;
}

export function TimeAgo({ date }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    const update = () => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      setTimeAgo(
        formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR })
      );
    };

    update(); // Roda imediatamente na montagem

    // Atualiza a cada minuto para manter o tempo relevante
    const intervalId = setInterval(update, 60000);

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);
  }, [date]);

  return <span title={new Date(date).toLocaleString("pt-BR")}>{timeAgo}</span>;
}
