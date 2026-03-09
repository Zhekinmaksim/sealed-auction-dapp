# 🔐 Sealed Bid Auction — Inco FHE dApp

Конфиденциальный аукцион с запечатанными ставками на базе **Inco Lightning FHE**.  
Ставки шифруются на клиенте и сравниваются на блокчейне **без расшифровки**.

**Сеть:** Base Sepolia · **Технология:** Fully Homomorphic Encryption (FHE)

---

## 📁 Структура проекта

```
sealed-auction/
├── contracts/              # Solidity-контракты (Foundry)
│   ├── src/
│   │   └── ConfSealedAuction.sol
│   ├── test/
│   │   └── ConfSealedAuction.t.sol
│   ├── script/
│   │   └── DeployConfSealedAuction.s.sol
│   └── foundry.toml
├── frontend/               # Next.js 14 приложение
│   ├── app/
│   ├── components/
│   │   ├── SealedAuctionUI.tsx
│   │   └── Providers.tsx
│   ├── hooks/
│   │   └── useConfSealedAuction.ts
│   └── lib/
│       ├── abi.ts
│       └── wagmi.ts
├── vercel.json             # Конфигурация для Vercel
└── README.md
```

---

## ⚙️ Предварительные требования

- **Node.js** v18+ и npm
- **Foundry** — `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **MetaMask** с Base Sepolia ETH
- **WalletConnect Project ID** — [cloud.walletconnect.com](https://cloud.walletconnect.com)

---

## 🚀 Быстрый старт (локально)

### 1. Клонируем и устанавливаем зависимости

```bash
cd sealed-auction
npm install          # корневые зависимости
cd frontend && npm install
```

### 2. Тестируем контракт

```bash
cd contracts
forge test -vvv
```

### 3. Деплоим контракт на Base Sepolia

```bash
cd contracts
cp .env.example .env
# Заполните .env:
# PRIVATE_KEY_BASE_SEPOLIA=ваш_приватный_ключ_без_0x
# BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

source .env
forge script script/DeployConfSealedAuction.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast
```

Скопируйте адрес из вывода — он нужен для фронтенда.

### 4. Настраиваем фронтенд

```bash
cd frontend
cp .env.example .env.local
# Заполните .env.local:
# NEXT_PUBLIC_AUCTION_ADDRESS=0xВАШ_АДРЕС_КОНТРАКТА
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=ваш_id
```

### 5. Запускаем локально

```bash
cd frontend
npm run dev
# Открыть: http://localhost:3000
```

---

## 🌐 Деплой на Vercel

### Способ 1: GitHub + Vercel (рекомендуется)

1. Запушьте репозиторий на GitHub
2. Зайдите на [vercel.com](https://vercel.com) → New Project
3. Импортируйте репозиторий
4. Vercel автоматически определит Next.js из `vercel.json`
5. Добавьте переменные окружения в настройках проекта:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_AUCTION_ADDRESS` | `0x...адрес контракта` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `ваш_project_id` |

6. Нажмите **Deploy** ✅

### Способ 2: Vercel CLI

```bash
npm i -g vercel
cd sealed-auction
vercel
# Следуйте инструкциям, укажите переменные окружения
```

---

## 📖 Как использовать аукцион

1. Подключите MetaMask к **Base Sepolia**
2. Убедитесь, что есть тестовые ETH ([faucets](https://www.alchemy.com/faucets/base-sepolia))
3. Введите сумму ставки и нажмите **Seal Bid**
4. SDK зашифрует значение через FHE и отправит транзакцию
5. Ожидайте подтверждения — ставка сохранена в зашифрованном виде
6. После окончания таймера **владелец** нажимает **Finalize**
7. Каждый участник может расшифровать свою ставку
8. Владелец нажимает **Start New Auction** для следующего раунда

---

## 🔑 Ключевые концепции Inco FHE

| Концепция | Описание |
|---|---|
| `euint256` | Зашифрованный uint256 (handle к скрытому значению) |
| `e.asEuint256(0)` | Создаёт зашифрованный ноль |
| `.newEuint256(bytes, sender)` | Создаёт зашифрованное значение из входных данных |
| `.gt()`, `.select()` | Сравнение и условный выбор над зашифрованными данными |
| `.allow(address)` | Даёт адресу доступ к расшифровке значения |
| `.allowThis()` | Даёт контракту доступ к значению |

---

## 🛠️ Полезные команды

| Команда | Описание |
|---|---|
| `forge build` | Компиляция контрактов |
| `forge test -vvv` | Запуск тестов |
| `npm run dev` | Запуск фронтенда локально |
| `npm run deploy` | Деплой контракта |

---

## 🔗 Ресурсы

- [Inco Documentation](https://docs.inco.org)
- [create-inco-app](https://github.com/inco-org/create-inco-app)
- [Inco JS SDK](https://www.npmjs.com/package/@inco/js)
- [Base Sepolia Explorer](https://sepolia.basescan.org)
- [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)

---

> ⚠️ **Никогда не коммитьте файлы `.env` с приватными ключами в git!**
