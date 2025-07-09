"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { clinicsAPI, roomsAPI, type Clinic, type Room } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { CRMLayout } from "@/components/crm-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowLeft,
  BedDouble,
  Plus,
  Building,
  MapPin,
  Phone,
  User,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";

function RoomCard({
  room,
  onImageUpload,
  canManage,
}: {
  room: Room;
  onImageUpload: (roomId: number) => void;
  canManage: boolean;
}) {
  return (
    <Card
      key={room.id}
      className="flex flex-col justify-between overflow-hidden"
    >
      {room.image_url ? (
        <div className="relative h-40 w-full">
          <Image
            src={room.image_url}
            alt={room.name}
            layout="fill"
            objectFit="cover"
          />
        </div>
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-muted">
          <ImageIcon className="h-12 w-12 text-gray-400" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-semibold">{room.name}</h3>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onImageUpload(room.id)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Foto
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-2 h-10">
          {room.description}
        </p>
        <div className="text-xs mt-4 space-y-1 border-t pt-2">
          <p>
            <strong>Hora:</strong> R$ {room.price_per_hour} (+/-{" "}
            {room.negotiation_margin_hour}%)
          </p>
          <p>
            <strong>Turno:</strong> R$ {room.price_per_shift} (+/-{" "}
            {room.negotiation_margin_shift}%)
          </p>
        </div>
      </div>
    </Card>
  );
}

function ClinicDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const clinicId = Number(params.id);

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchClinicDetails = useCallback(async () => {
    if (!clinicId) return;
    setIsLoading(true);
    try {
      const data = await clinicsAPI.getById(clinicId);
      setClinic(data);
    } catch (error) {
      toast({
        title: "Erro ao carregar detalhes da clínica",
        variant: "destructive",
      });
      router.push("/clinics");
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, router, toast]);

  useEffect(() => {
    fetchClinicDetails();
  }, [fetchClinicDetails]);

  const handleSaveRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clinic) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const roomData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price_per_hour: Number(formData.get("price_per_hour")),
      negotiation_margin_hour: Number(formData.get("negotiation_margin_hour")),
      price_per_shift: Number(formData.get("price_per_shift")),
      negotiation_margin_shift: Number(
        formData.get("negotiation_margin_shift")
      ),
      price_per_day: Number(formData.get("price_per_day")),
      negotiation_margin_day: Number(formData.get("negotiation_margin_day")),
      price_fixed: Number(formData.get("price_fixed")),
      negotiation_margin_fixed: Number(
        formData.get("negotiation_margin_fixed")
      ),
    };

    try {
      await clinicsAPI.createRoom(clinic.id, roomData as any);
      toast({ title: "Sala adicionada com sucesso!" });
      setIsRoomDialogOpen(false);
      fetchClinicDetails();
    } catch (error) {
      toast({ title: "Erro ao adicionar sala", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUploadDialog = (roomId: number) => {
    setSelectedRoomId(roomId);
    setIsImageUploadOpen(true);
    setSelectedFile(null);
  };

  const handleUploadImage = async () => {
    if (!selectedFile || !selectedRoomId) return;

    setIsSubmitting(true);
    try {
      // 1. Obter a URL de upload assinada do backend
      const { signedURL, path } = await roomsAPI.createSignedUploadUrl(
        selectedRoomId,
        selectedFile.name,
        selectedFile.type
      );

      // 2. Fazer o upload do arquivo para a URL recebida
      await fetch(signedURL, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      // 3. Atualizar o banco de dados com o caminho do arquivo
      await roomsAPI.updateImageUrl(selectedRoomId, path);

      toast({ title: "Imagem enviada com sucesso!" });
      fetchClinicDetails();
      setIsImageUploadOpen(false);
    } catch (error) {
      console.error("Erro no upload:", error);
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <CRMLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-16 w-16 animate-spin" />
        </div>
      </CRMLayout>
    );
  }

  if (!clinic) {
    return (
      <CRMLayout>
        <div>Clínica não encontrada.</div>
      </CRMLayout>
    );
  }

  const canManage = user?.role === "admin" || user?.role === "gerente";

  return (
    <CRMLayout>
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => router.push("/clinics")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a lista
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Building className="h-8 w-8 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <CardTitle className="text-3xl">{clinic.name}</CardTitle>
                <CardDescription>
                  {clinic.address || "Endereço não informado"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />{" "}
              <span>{`${clinic.address}, ${clinic.numero || "S/N"} - ${
                clinic.city
              }, ${clinic.state}`}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />{" "}
              <span>{clinic.phone || "Não informado"}</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />{" "}
              <span>Anfitrião: {clinic.host_name || "Não informado"}</span>
            </div>
            <div className="flex items-center gap-3 col-span-full">
              <MapPin className="h-5 w-5 text-muted-foreground" />{" "}
              <span>Ref: {clinic.ponto_referencia || "Não informado"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Salas</CardTitle>
              <CardDescription>
                Salas disponíveis nesta clínica.
              </CardDescription>
            </div>
            {canManage && (
              <Dialog
                open={isRoomDialogOpen}
                onOpenChange={setIsRoomDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Sala
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nova Sala para {clinic.name}</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={handleSaveRoom}
                    className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4"
                  >
                    <div className="space-y-2">
                      <Label>Nome da Sala</Label>
                      <Input name="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea name="description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Preço/Hora</Label>
                        <Input
                          name="price_per_hour"
                          type="number"
                          step="0.01"
                          defaultValue={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Margem Hora (%)</Label>
                        <Input
                          name="negotiation_margin_hour"
                          type="number"
                          step="0.01"
                          defaultValue={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço/Turno</Label>
                        <Input
                          name="price_per_shift"
                          type="number"
                          step="0.01"
                          defaultValue={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Margem Turno (%)</Label>
                        <Input
                          name="negotiation_margin_shift"
                          type="number"
                          step="0.01"
                          defaultValue={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço/Dia</Label>
                        <Input
                          name="price_per_day"
                          type="number"
                          step="0.01"
                          defaultValue={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Margem Dia (%)</Label>
                        <Input
                          name="negotiation_margin_day"
                          type="number"
                          step="0.01"
                          defaultValue={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço Fixo</Label>
                        <Input
                          name="price_fixed"
                          type="number"
                          step="0.01"
                          defaultValue={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Margem Fixo (%)</Label>
                        <Input
                          name="negotiation_margin_fixed"
                          type="number"
                          step="0.01"
                          defaultValue={0}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsRoomDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}{" "}
                        Salvar Sala
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinic.rooms && clinic.rooms.length > 0 ? (
                clinic.rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onImageUpload={handleImageUploadDialog}
                    canManage={canManage}
                  />
                ))
              ) : (
                <p className="col-span-full text-center text-muted-foreground py-8">
                  Nenhuma sala cadastrada para esta clínica.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={isImageUploadOpen} onOpenChange={setIsImageUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Imagem da Sala</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="picture">Selecione a imagem</Label>
              <Input
                id="picture"
                type="file"
                onChange={(e) =>
                  setSelectedFile(e.target.files ? e.target.files[0] : null)
                }
                accept="image/*"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsImageUploadOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUploadImage}
                disabled={!selectedFile || isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CRMLayout>
  );
}

export default ClinicDetailsPage;
