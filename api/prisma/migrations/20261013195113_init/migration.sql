-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senhaHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Insumo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `unidadeCompra` ENUM('G', 'KG', 'ML', 'L', 'UN') NOT NULL,
    `quantidadeEmbalagem` DECIMAL(12, 3) NOT NULL,
    `precoEmbalagem` DECIMAL(10, 2) NOT NULL,
    `aproveitamentoPercentual` DECIMAL(5, 2) NOT NULL DEFAULT 100,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Insumo_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Receita` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `rendimentoPorcoes` INTEGER NOT NULL,
    `custosExtrasPercentual` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `margemDesejadaPercentual` DECIMAL(5, 2) NOT NULL,
    `observacoes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Receita_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReceitaItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `receitaId` INTEGER NOT NULL,
    `insumoId` INTEGER NOT NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `unidade` ENUM('G', 'KG', 'ML', 'L', 'UN') NOT NULL,

    INDEX `ReceitaItem_receitaId_idx`(`receitaId`),
    INDEX `ReceitaItem_insumoId_idx`(`insumoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Insumo` ADD CONSTRAINT `Insumo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receita` ADD CONSTRAINT `Receita_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceitaItem` ADD CONSTRAINT `ReceitaItem_receitaId_fkey` FOREIGN KEY (`receitaId`) REFERENCES `Receita`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceitaItem` ADD CONSTRAINT `ReceitaItem_insumoId_fkey` FOREIGN KEY (`insumoId`) REFERENCES `Insumo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
