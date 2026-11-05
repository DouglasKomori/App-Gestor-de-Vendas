-- AlterTable
ALTER TABLE `Receita` ADD COLUMN `precoVendaPraticado` DECIMAL(10, 2) NULL,
    ADD COLUMN `taxaVendaPercentual` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `tempoPreparoMinutos` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `valorHoraTrabalho` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `ReceitaItem` ADD COLUMN `medidaCaseiraId` INTEGER NULL;

-- CreateTable
CREATE TABLE `MedidaCaseira` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `insumoId` INTEGER NOT NULL,
    `nome` VARCHAR(60) NOT NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `unidade` ENUM('G', 'KG', 'ML', 'L', 'UN') NOT NULL,

    UNIQUE INDEX `MedidaCaseira_insumoId_nome_key`(`insumoId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ReceitaItem_medidaCaseiraId_idx` ON `ReceitaItem`(`medidaCaseiraId`);

-- AddForeignKey
ALTER TABLE `MedidaCaseira` ADD CONSTRAINT `MedidaCaseira_insumoId_fkey` FOREIGN KEY (`insumoId`) REFERENCES `Insumo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceitaItem` ADD CONSTRAINT `ReceitaItem_medidaCaseiraId_fkey` FOREIGN KEY (`medidaCaseiraId`) REFERENCES `MedidaCaseira`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
