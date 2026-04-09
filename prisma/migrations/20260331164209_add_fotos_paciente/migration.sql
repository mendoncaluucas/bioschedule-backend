-- CreateTable
CREATE TABLE "FotoPaciente" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "legenda" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pacienteId" TEXT NOT NULL,

    CONSTRAINT "FotoPaciente_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FotoPaciente" ADD CONSTRAINT "FotoPaciente_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
