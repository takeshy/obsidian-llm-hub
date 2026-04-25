# LLM Hub pour Obsidian

[![DeepWiki](https://img.shields.io/badge/DeepWiki-takeshy%2Fobsidian--llm--hub-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTloMTZhMiAyIDAgMCAwIDItMlY3YTIgMiAwIDAgMC0yLTJINWEyIDIgMCAwIDAtMiAydjEyYTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTkgMTV2LTQiLz48cGF0aCBkPSJNMTIgMTV2LTIiLz48cGF0aCBkPSJNMTUgMTV2LTQiLz48L3N2Zz4=)](https://deepwiki.com/takeshy/obsidian-llm-hub)

Assistant IA **gratuit et open-source** pour Obsidian avec **Chat**, **Automatisation de Workflows** et **Recherche Sémantique (RAG)**. Supporte plusieurs fournisseurs LLM — utilisez l'IA qui correspond le mieux à vos besoins.

> **Utilisez n'importe quel fournisseur LLM :** [Gemini](https://ai.google.dev), [OpenAI](https://platform.openai.com), [Anthropic](https://console.anthropic.com), [OpenRouter](https://openrouter.ai), [Grok](https://console.x.ai), [OpenCode Zen / Go](https://opencode.ai), LLMs locaux ([Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), [vLLM](https://docs.vllm.ai), [OpenCode](https://opencode.ai)), ou outils CLI ([Gemini CLI](https://github.com/google-gemini/gemini-cli), [Claude Code](https://github.com/anthropics/claude-code), [Codex CLI](https://github.com/openai/codex)).

## Points Forts

- **Chat LLM Multi-Fournisseurs** - Utilisez Gemini, OpenAI, Anthropic, OpenRouter, Grok, OpenCode Zen/Go, des LLMs locaux ou des backends CLI
- **Opérations sur le Coffre** - L'IA lit, écrit, recherche et édite vos notes avec Function Calling (Gemini, OpenAI, Anthropic, OpenCode Zen/Go, et LLMs locaux compatibles outils via LM Studio / vLLM / AnythingLLM)
- **Constructeur de Workflows** - Automatisez des tâches multi-étapes avec l'éditeur visuel de nœuds et 25 types de nœuds
- **Recherche Sémantique (RAG)** - Recherche vectorielle locale avec onglet de recherche dédié, aperçu PDF et flux résultats vers chat
- **AI Discussion** - Arène de débat multi-modèle avec réponses parallèles, vote et détermination du gagnant
- **Historique d'Édition** - Suivez et restaurez les modifications faites par l'IA avec vue des différences
- **Recherche Web** - Accédez à des informations actualisées via Google Search (Gemini)
- **Génération d'Images** - Créez des images avec Gemini ou DALL-E
- **Intégration Discord** - Connectez votre LLM à Discord en tant que bot de chat avec changement de modèle/RAG par canal
- **Chiffrement** - Protection par mot de passe de l'historique de chat et des journaux d'exécution des workflows


## Fournisseurs Supportés

| Fournisseur | Chat | Outils du Coffre | Recherche Web | Génération d'Images | RAG |
|-------------|------|-------------------|---------------|---------------------|-----|
| **Gemini** (API) | ✅ Streaming | ✅ Function calling | ✅ Google Search | ✅ Modèles d'images Gemini | ✅ |
| **OpenAI** (API) | ✅ Streaming | ✅ Function calling | ❌ | ✅ DALL-E | ✅ |
| **Anthropic** (API) | ✅ Streaming | ✅ Tool use | ❌ | ❌ | ✅ |
| **OpenRouter** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **Grok** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **LLM Local** (Ollama, LM Studio, vLLM) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |
| **CLI** (Gemini, Claude, Codex) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |

> [!TIP]
> **Plusieurs fournisseurs peuvent être configurés simultanément.** Changez de modèle librement pendant le chat — chaque fournisseur a sa propre clé API et ses paramètres.

> [!TIP]
> Les **options CLI** vous permettent d'utiliser les modèles phares avec juste un compte - aucune clé API requise !
> - **Gemini CLI** : Installez [Gemini CLI](https://github.com/google-gemini/gemini-cli), lancez `gemini` et authentifiez-vous avec `/auth`
> - **Claude CLI** : Installez [Claude Code](https://github.com/anthropics/claude-code) (`npm install -g @anthropic-ai/claude-code`), lancez `claude` et authentifiez-vous
> - **Codex CLI** : Installez [Codex CLI](https://github.com/openai/codex) (`npm install -g @openai/codex`), lancez `codex` et authentifiez-vous

### Conseils pour la Clé API Gratuite Gemini

- Les **limites de débit** sont par modèle et se réinitialisent quotidiennement. Changez de modèle pour continuer à travailler.
- **Gemma 4** ne peut pas combiner les appels de fonction avec RAG/Web Search dans une seule requête. Lorsque RAG ou Web Search est actif, les outils Vault sont automatiquement désactivés. Les **modèles CLI**, **Ollama** et le **OpenCode local server** ne supportent pas les outils du coffre (utilisez les **Workflows** avec `note`, `note-read`, etc., ou les variables `{content}` / `{selection}`). Les LLMs locaux **LM Studio / vLLM / AnythingLLM** supportent les outils du coffre lorsque le modèle sous-jacent prend en charge le Function Calling de style OpenAI — les modèles incompatibles sont détectés automatiquement à la première utilisation et rétrogradés en mode skill basé sur des marqueurs.

---

# Chat IA

La fonctionnalité Chat IA fournit une interface de conversation interactive avec le fournisseur LLM de votre choix, intégrée à votre coffre Obsidian.

![Interface de Chat](docs/images/chat.png)

**Ouvrir le Chat:**
- Cliquez sur l'icône de chat dans le ruban
- Commande : "LLM Hub: Open chat"
- Basculer : "LLM Hub: Toggle chat / editor"

**Contrôles du Chat:**
- **Entrée** - Envoyer le message
- **Shift+Entrée** - Nouvelle ligne
- **Bouton Stop** - Arrêter la génération
- **Bouton +** - Nouveau chat
- **Bouton Historique** - Charger les chats précédents

## Commandes Slash

Créez des modèles de prompts réutilisables déclenchés par `/` :

- Définissez des modèles avec `{selection}` (texte sélectionné) et `{content}` (note active)
- Modèle et recherche optionnels personnalisables par commande
- Tapez `/` pour voir les commandes disponibles

**Par défaut :** `/infographic` - Convertit le contenu en infographie HTML

![Exemple d'Infographie](docs/images/chat_infographic.png)

## Mentions @

Référencez des fichiers et variables en tapant `@` :

- `{selection}` - Texte sélectionné
- `{content}` - Contenu de la note active
- N'importe quel fichier du coffre - Parcourez et insérez (chemin uniquement ; l'IA lit le contenu via les outils)

> [!NOTE]
> **Comment fonctionnent `{selection}` et `{content}` :** Lorsque vous passez de la vue Markdown à la vue Chat, la sélection serait normalement effacée en raison du changement de focus. Pour préserver votre sélection, le plugin la capture lors du changement de vue et met en surbrillance la zone sélectionnée avec une couleur d'arrière-plan dans la vue Markdown. L'option `{selection}` n'apparaît dans les suggestions @ que lorsqu'un texte a été sélectionné.
>
> `{selection}` et `{content}` ne sont intentionnellement **pas développés** dans la zone de saisie—comme la zone de saisie du chat est compacte, développer un texte long rendrait la saisie difficile. Le contenu est développé lorsque vous envoyez le message, ce que vous pouvez vérifier en consultant votre message envoyé dans le chat.

> [!NOTE]
> Les mentions @ de fichiers du coffre insèrent uniquement le chemin du fichier - l'IA lit le contenu via les outils. Cela ne fonctionne pas avec les modèles CLI, Ollama ni OpenCode (Local) (pas de support des outils du coffre) ; Gemini CLI peut lire les fichiers via le shell, mais le format de réponse peut différer. Les LLMs locaux **LM Studio / vLLM / AnythingLLM** fonctionnent si le modèle chargé supporte le tool calling.

## Pièces Jointes

Joignez des fichiers directement : Images (PNG, JPEG, GIF, WebP), PDFs, Fichiers texte

## Appel de Fonctions (Opérations sur le Coffre)

L'IA peut interagir avec votre coffre en utilisant ces outils :

| Outil | Description |
|-------|-------------|
| `read_note` | Lire le contenu d'une note |
| `create_note` | Créer de nouvelles notes |
| `propose_edit` | Éditer avec dialogue de confirmation |
| `propose_delete` | Supprimer avec dialogue de confirmation |
| `bulk_propose_edit` | Édition en masse de plusieurs fichiers avec dialogue de sélection |
| `bulk_propose_delete` | Suppression en masse de plusieurs fichiers avec dialogue de sélection |
| `search_notes` | Rechercher dans le coffre par nom ou contenu |
| `list_notes` | Lister les notes dans un dossier |
| `rename_note` | Renommer/déplacer des notes |
| `create_folder` | Créer de nouveaux dossiers |
| `list_folders` | Lister les dossiers dans le coffre |
| `get_active_note_info` | Obtenir des infos sur la note active |
| `bulk_propose_rename` | Renommage en masse de plusieurs fichiers avec dialogue de sélection |

### Mode Outils du Coffre

Lorsque l'IA gère des notes dans le Chat, elle utilise les outils du Vault. Contrôlez quels outils du coffre l'IA peut utiliser via l'icône de base de données (📦) sous le bouton de pièce jointe :

| Mode | Description | Outils Disponibles |
|------|-------------|-------------------|
| **Vault: Tous** | Accès complet au coffre | Tous les outils |
| **Vault: Sans recherche** | Exclure les outils de recherche | Tous sauf `search_notes`, `list_notes` |
| **Vault: Désactivé** | Aucun accès au coffre | Aucun |

**Quand utiliser chaque mode :**

- **Vault: Tous** - Mode par défaut pour une utilisation générale. L'IA peut lire, écrire et rechercher dans votre coffre.
- **Vault: Sans recherche** - Utilisez-le lorsque vous connaissez déjà le fichier cible. Cela évite les recherches redondantes dans le vault, économisant des tokens et améliorant le temps de réponse.
- **Vault: Désactivé** - Utilisez-le lorsque vous n'avez pas besoin d'accès au vault du tout.

**Sélection automatique du mode :**

| Condition | Mode Par Défaut | Modifiable |
|-----------|-----------------|------------|
| Modèles CLI (Gemini/Claude/Codex CLI) | Vault: Désactivé | Non |
| LLM Local | Vault: Désactivé | Non |
| Gemma 4 + RAG/Web Search | Vault: Désactivé | Oui (désactiver RAG/Web Search réactive les outils) |
| Normal | Vault: Tous | Oui |

**Pourquoi certains modes sont forcés :**

- **Modèles CLI, Ollama, OpenCode (Local)** : Ne supportent pas le Function Calling de style OpenAI, donc les outils Vault ne peuvent pas être utilisés. Les LLMs locaux **LM Studio / vLLM / AnythingLLM** PEUVENT utiliser les outils Vault lorsque le modèle chargé supporte le tool calling ; si un modèle rejette la première requête avec outils, il est marqué automatiquement et bascule en mode marqueurs pour les tours suivants (effacez la marque dans **Paramètres → Local LLM → Re-enable tools**).
- **Gemma 4** : Les appels de fonction et RAG/Web Search ne peuvent pas être combinés dans une seule requête. Lorsque l'un est actif, l'autre est automatiquement désactivé.

## Édition Sécurisée

Quand l'IA utilise `propose_edit` :
1. Un dialogue de confirmation affiche les modifications proposées
2. Cliquez sur **Appliquer** pour écrire les modifications dans le fichier
3. Cliquez sur **Annuler** pour annuler sans modifier le fichier

> Les modifications ne sont PAS écrites tant que vous ne confirmez pas.

## Historique d'Édition

Suivez et restaurez les modifications apportées à vos notes :

- **Suivi automatique** - Toutes les modifications IA (chat, workflow) et manuelles sont enregistrées
- **Accès via menu fichier** - Clic droit sur un fichier markdown pour accéder à :
  - **Snapshot** - Sauvegarder l'état actuel comme instantané
  - **History** - Ouvrir le modal d'historique d'édition


- **Palette de commandes** - Aussi disponible via la commande "Show edit history"
- **Vue des différences** - Voyez exactement ce qui a changé avec ajouts/suppressions codés par couleur
- **Restaurer** - Revenez à n'importe quelle version précédente en un clic
- **Copier** - Enregistre une version historique comme nouveau fichier (nom par défaut : `{filename}_{datetime}.md`)
- **Modal redimensionnable** - Glissez pour déplacer, redimensionnez depuis les coins

**Affichage des différences :**
- Les lignes `+` existaient dans la version précédente
- Les lignes `-` ont été ajoutées dans la version plus récente

**Comment ça fonctionne :**

L'historique d'édition utilise une approche basée sur les instantanés :

1. **Création d'instantané** - Quand un fichier est ouvert pour la première fois ou modifié par l'IA, un instantané de son contenu est sauvegardé
2. **Enregistrement des différences** - Quand le fichier est modifié, la différence entre le nouveau contenu et l'instantané est enregistrée comme entrée d'historique
3. **Mise à jour de l'instantané** - L'instantané est mis à jour avec le nouveau contenu après chaque modification
4. **Restaurer** - Pour restaurer une version précédente, les différences sont appliquées en sens inverse depuis l'instantané

**Quand l'historique est enregistré :**
- Modifications chat IA (outil `propose_edit`)
- Modifications de notes dans les workflows (nœud `note`)
- Sauvegardes manuelles via commande
- Auto-détection quand le fichier diffère de l'instantané à l'ouverture

**Stockage :** L'historique des modifications est stocké en mémoire et effacé au redémarrage d'Obsidian. Le suivi persistant des versions est couvert par la récupération de fichiers intégrée d'Obsidian.

![Modal Historique d'Édition](docs/images/edit_history.png)

## Serveurs MCP

Les serveurs MCP (Model Context Protocol) fournissent des outils supplémentaires qui étendent les capacités de l'IA au-delà des opérations du vault.

**Deux modes de transport sont supportés :**

**HTTP (Streamable HTTP) :**

1. Ouvrez les paramètres du plugin → section **Serveurs MCP**
2. Cliquez sur **Ajouter un serveur** → sélectionnez **HTTP**
3. Entrez le nom et l'URL du serveur
4. Configurez les en-têtes optionnels (format JSON) pour l'authentification
5. Cliquez sur **Tester la connexion** pour vérifier et récupérer les outils disponibles
6. Enregistrez la configuration du serveur

**Stdio (Processus local) :**

1. Ouvrez les paramètres du plugin → section **Serveurs MCP**
2. Cliquez sur **Ajouter un serveur** → sélectionnez **Stdio**
3. Entrez le nom du serveur et la commande (ex : `npx -y @modelcontextprotocol/server-filesystem /path/to/dir`)
4. Configurez les variables d'environnement optionnelles (format JSON)
5. Cliquez sur **Tester la connexion** pour vérifier et récupérer les outils disponibles
6. Enregistrez la configuration du serveur

> **Note :** Le transport Stdio lance un processus local et est réservé au desktop. Le test de connexion est obligatoire avant l'enregistrement.

![Paramètres des Serveurs MCP](docs/images/setting_mcp.png)

**Utilisation des outils MCP :**

- **Dans le chat :** Cliquez sur l'icône de base de données (📦) pour ouvrir les paramètres des outils. Activez/désactivez les serveurs MCP par conversation.
- **Dans les workflows :** Utilisez le nœud `mcp` pour appeler les outils du serveur MCP.

**Indices d'outils :** Après un test de connexion réussi, les noms des outils disponibles sont enregistrés et affichés dans les paramètres et l'interface de chat.

### MCP Apps (UI Interactive)

Certains outils MCP retournent une UI interactive qui permet d'interagir visuellement avec les résultats de l'outil. Cette fonctionnalité est basée sur la [spécification MCP Apps](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/mcp_apps).


**Comment ça fonctionne :**

- Quand un outil MCP retourne un URI de ressource `ui://` dans les métadonnées de sa réponse, le plugin récupère et affiche le contenu HTML
- L'UI est affichée dans un iframe isolé pour la sécurité (`sandbox="allow-scripts allow-forms"`)
- Les applications interactives peuvent appeler des outils MCP supplémentaires et mettre à jour le contexte via un pont JSON-RPC

**Dans le Chat :**
- MCP Apps apparaît en ligne dans les messages de l'assistant avec un bouton développer/réduire
- Cliquez sur ⊕ pour développer en plein écran, ⊖ pour réduire

**Dans les Workflows :**
- MCP Apps est affiché dans une boîte de dialogue modale pendant l'exécution du workflow
- Le workflow se met en pause pour permettre l'interaction de l'utilisateur, puis continue quand le modal est fermé

> **Sécurité :** Tout le contenu MCP App s'exécute dans un iframe isolé avec des permissions restreintes. L'iframe ne peut pas accéder au DOM de la page parente, aux cookies ou au stockage local. Seuls `allow-scripts` et `allow-forms` sont activés.

## Skills d'Agent

Étendez les capacités de l'IA avec des instructions personnalisées, des documents de référence et des workflows exécutables. Les skills suivent le modèle standard de l'industrie pour les skills d'agent (ex. [OpenAI Codex](https://github.com/openai/codex) `.codex/skills/`).

- **Instructions personnalisées** - Définissez un comportement spécifique au domaine via des fichiers `SKILL.md`
- **Documents de référence** - Incluez des guides de style, modèles et listes de contrôle dans `references/`
- **Intégration des workflows** - Les skills peuvent exposer des workflows comme outils de Function Calling
- **Commande slash** - Tapez `/folder-name` pour invoquer un skill instantanément et envoyer
- **Support mode CLI** - Les skills fonctionnent avec les backends Gemini CLI, Claude CLI et Codex CLI
- **Activation sélective** - Choisissez quels skills sont actifs par conversation

Créez des skills de la même manière que les workflows — sélectionnez **+ New (AI)**, cochez **« Créer en tant qu'agent skill »** et décrivez ce que vous souhaitez. L'AI génère à la fois les instructions du `SKILL.md` et le workflow.

> **Pour les instructions de configuration et des exemples, consultez [SKILLS.md](docs/SKILLS_fr.md)**

---

# Intégration Discord

Connectez le LLM de votre coffre Obsidian à Discord en tant que bot de chat. Les utilisateurs peuvent discuter avec l'IA, changer de modèle, utiliser la recherche RAG et activer des commandes slash — le tout depuis Discord.

## Configuration

### 1. Créer un bot Discord

1. Rendez-vous sur le [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur **New Application** → entrez un nom → **Create**
3. Allez dans **Bot** dans la barre latérale gauche
4. Cliquez sur **Reset Token** → copiez le token du bot (vous en aurez besoin plus tard)
5. Sous **Privileged Gateway Intents**, activez **Message Content Intent** (requis pour lire le contenu des messages)

### 2. Inviter le bot sur votre serveur

1. Allez dans **OAuth2** dans la barre latérale gauche
2. Sous **OAuth2 URL Generator**, sélectionnez le scope **bot**
3. Sous **Bot Permissions**, sélectionnez :
   - **Send Messages**
   - **Read Message History**
4. Copiez l'URL générée et ouvrez-la dans votre navigateur
5. Sélectionnez un serveur et autorisez le bot

### 3. Configurer dans Obsidian

1. Ouvrez les paramètres du plugin → section **Discord**
2. Activez **Discord Bot**
3. Collez le token du bot
4. Cliquez sur **Connect** (le plugin vérifie le token avant de se connecter)
5. L'indicateur de statut affiche si le bot est connecté

## Options de Configuration

| Paramètre | Description | Par défaut |
|-----------|-------------|------------|
| **Enabled** | Activer/désactiver le bot Discord | Désactivé |
| **Bot Token** | Token du bot Discord depuis le Developer Portal | — |
| **Respond to DMs** | Si le bot répond aux messages directs | Activé |
| **Require @mention** | Dans les canaux du serveur, ne répondre que lorsque @mentionné (les DMs répondent toujours) | Activé |
| **Allowed Channel IDs** | IDs de canaux séparés par des virgules pour restreindre l'accès (vide = tous les canaux) | vide |
| **Allowed User IDs** | IDs d'utilisateurs séparés par des virgules pour restreindre l'accès (vide = tous les utilisateurs) | vide |
| **Model Override** | Spécifier quel modèle utiliser pour Discord (vide = modèle actuellement sélectionné) | vide |
| **System Prompt Override** | Prompt système personnalisé pour les conversations Discord | vide |
| **Max Response Length** | Nombre maximum de caractères par message (1–2000, limite de Discord) | 2000 |

> [!TIP]
> **Trouver les IDs de canaux/utilisateurs :** Dans Discord, activez le **Mode Développeur** (Paramètres → Avancé → Mode Développeur). Ensuite, faites un clic droit sur un canal ou un utilisateur et sélectionnez **Copier l'identifiant**.

## Commandes du Bot

Les utilisateurs peuvent interagir avec le bot en utilisant ces commandes dans Discord :

| Commande | Description |
|----------|-------------|
| `!model` | Lister les modèles disponibles |
| `!model <nom>` | Passer à un modèle spécifique pour ce canal |
| `!rag` | Lister les paramètres RAG disponibles |
| `!rag <nom>` | Passer à un paramètre RAG spécifique pour ce canal |
| `!rag off` | Désactiver RAG pour ce canal |
| `!skill` | Lister les commandes slash disponibles |
| `!skill <nom>` | Activer une commande slash (peut nécessiter un message de suivi) |
| `!discuss <theme>` | Lancer une AI Discussion avec les participants configurés (en arrière-plan) |
| `!reset` | Effacer l'historique de conversation pour ce canal |
| `!help` | Afficher le message d'aide |

## Fonctionnalités

- **Support multi-fournisseurs** — Fonctionne avec tous les fournisseurs LLM configurés (Gemini, OpenAI, Anthropic, OpenRouter, Grok, CLI, LLM Local)
- **État par canal** — Chaque canal Discord conserve son propre historique de conversation, sa sélection de modèle et son paramètre RAG
- **Outils du coffre** — L'IA a un accès complet aux outils du coffre (lire, écrire, rechercher des notes) selon les paramètres de votre plugin
- **Intégration RAG** — La recherche sémantique peut être activée par canal via la commande `!rag`
- **Commandes slash** — Activez les commandes slash du plugin via `!skill`
- **Découpage des longs messages** — Les réponses dépassant la limite de 2000 caractères de Discord sont automatiquement découpées à des points de coupure naturels
- **Mémoire de conversation** — Historique par canal (maximum 20 messages, TTL de 30 minutes)
- **Reconnexion automatique** — Récupère des pertes de connexion avec backoff exponentiel

> [!NOTE]
> L'historique de conversation est conservé uniquement en mémoire et est effacé lorsque le bot se déconnecte ou qu'Obsidian redémarre.

---

# Constructeur de Workflows

Construisez des workflows automatisés multi-étapes directement dans les fichiers Markdown. **Aucune connaissance en programmation requise** - décrivez simplement ce que vous voulez en langage naturel, et l'IA créera le workflow pour vous.

![Éditeur Visuel de Workflow](docs/images/visual_workflow.png)

## Création de Workflows et Skills avec l'AI

**Vous n'avez pas besoin d'apprendre la syntaxe YAML ou les types de nœuds.** Décrivez simplement votre workflow en langage courant :

1. Ouvrez l'onglet **Workflow** dans la barre latérale LLM Hub
2. Sélectionnez **+ Nouveau (IA)** dans le menu déroulant
3. Décrivez ce que vous voulez : *"Créer un workflow qui résume la note sélectionnée et l'enregistre dans un dossier summaries"*
4. Cochez **« Créer en tant qu'agent skill »** si vous souhaitez créer un agent skill au lieu d'un workflow autonome
5. Cliquez sur **Générer** - l'IA crée le workflow complet

![Créer un Workflow avec l'IA](docs/images/create_workflow_with_ai.png)

**Modifiez les workflows existants de la même manière :**
1. Chargez n'importe quel workflow
2. Cliquez sur le bouton **Modifier avec IA**
3. Décrivez les modifications : *"Ajouter une étape pour traduire le résumé en japonais"*
4. Vérifiez et appliquez


## Types de Nœuds Disponibles

24 types de nœuds sont disponibles pour construire des workflows :

| Catégorie | Nœuds |
|-----------|-------|
| Variables | `variable`, `set` |
| Contrôle | `if`, `while` |
| LLM | `command` |
| Données | `http`, `json`, `script` |
| Notes | `note`, `note-read`, `note-search`, `note-list`, `folder-list`, `open` |
| Fichiers | `file-explorer`, `file-save` |
| Prompts | `prompt-file`, `prompt-selection`, `dialog` |
| Composition | `workflow` |
| Externe | `mcp`, `obsidian-command` |
| Utilitaire | `sleep` |

> **Pour les spécifications détaillées des nœuds et des exemples, voir [WORKFLOW_NODES_fr.md](docs/WORKFLOW_NODES_fr.md)**

## Mode Raccourcis Clavier

Assignez des raccourcis clavier pour exécuter des workflows instantanément :

1. Ajoutez un champ `name:` à votre workflow
2. Ouvrez le fichier workflow et sélectionnez le workflow dans le menu déroulant
3. Cliquez sur l'icône clavier (⌨️) dans le pied de page du panneau Workflow
4. Allez dans Paramètres → Raccourcis clavier → recherchez "Workflow: [Nom de Votre Workflow]"
5. Assignez un raccourci (ex., `Ctrl+Shift+T`)

Quand déclenché par raccourci :
- `prompt-file` utilise le fichier actif automatiquement (pas de dialogue)
- `prompt-selection` utilise la sélection courante, ou le contenu complet du fichier si pas de sélection

## Déclencheurs d'Événements

Les workflows peuvent être automatiquement déclenchés par des événements Obsidian :

![Paramètres de Déclencheur d'Événement](docs/images/event_setting.png)

| Événement | Description |
|-----------|-------------|
| Fichier Créé | Déclenché quand un nouveau fichier est créé |
| Fichier Modifié | Déclenché quand un fichier est sauvegardé (avec délai de 5s) |
| Fichier Supprimé | Déclenché quand un fichier est supprimé |
| Fichier Renommé | Déclenché quand un fichier est renommé |
| Fichier Ouvert | Déclenché quand un fichier est ouvert |

**Configuration du déclencheur d'événement :**
1. Ajoutez un champ `name:` à votre workflow
2. Ouvrez le fichier workflow et sélectionnez le workflow dans le menu déroulant
3. Cliquez sur l'icône éclair (⚡) dans le pied de page du panneau Workflow
4. Sélectionnez quels événements doivent déclencher le workflow
5. Optionnellement ajoutez un filtre de pattern de fichier

**Exemples de patterns de fichier :**
- `**/*.md` - Tous les fichiers Markdown dans n'importe quel dossier
- `journal/*.md` - Fichiers Markdown dans le dossier journal uniquement
- `*.md` - Fichiers Markdown dans le dossier racine uniquement
- `**/{daily,weekly}/*.md` - Fichiers dans les dossiers daily ou weekly
- `projects/[a-z]*.md` - Fichiers commençant par une lettre minuscule

**Variables d'événement :** Quand déclenché par un événement, ces variables sont définies automatiquement :

| Variable | Description |
|----------|-------------|
| `_eventType` | Type d'événement : `create`, `modify`, `delete`, `rename`, `file-open` |
| `_eventFilePath` | Chemin du fichier affecté |
| `_eventFile` | JSON avec les infos du fichier (path, basename, name, extension) |
| `_eventFileContent` | Contenu du fichier (pour les événements create/modify/file-open) |
| `_eventOldPath` | Chemin précédent (pour les événements rename uniquement) |

> **Note :** Les nœuds `prompt-file` et `prompt-selection` utilisent automatiquement le fichier de l'événement quand déclenchés par des événements. `prompt-selection` utilise le contenu entier du fichier comme sélection.

---

# Commun

## Modèles Supportés

### Gemini

| Modèle | Description |
|--------|-------------|
| Gemini 3.1 Pro Preview | Dernier modèle phare, contexte 1M (recommandé) |
| Gemini 3.1 Pro Preview (Custom Tools) | Optimisé pour les flux de travail agentiques avec outils personnalisés et bash |
| Gemini 3 Flash Preview | Modèle rapide, contexte 1M, meilleur rapport coût-performance |
| Gemini 3.1 Flash Lite Preview | Modèle le plus rentable avec hautes performances |
| Gemini 2.5 Flash | Modèle rapide, contexte 1M |
| Gemini 2.5 Pro | Modèle Pro, contexte 1M |
| Gemini 3 Pro (Image) | Génération d'images Pro, 4K |
| Gemini 3.1 Flash (Image) | Génération d'images rapide et économique |
| Gemma 4 | Gratuit, appels de fonction et RAG/Web Search mutuellement exclusifs |

> **Mode Thinking :** Dans le chat, le mode thinking est déclenché par des mots-clés comme « réfléchis », « analyse » ou « considère » dans votre message. Cependant, **Gemini 3.1 Pro** utilise toujours le mode thinking indépendamment des mots-clés — ce modèle ne permet pas de désactiver le thinking.

**Bascule Always Think :**

Vous pouvez forcer le mode thinking à ON pour les modèles Flash sans utiliser de mots-clés. Cliquez sur l'icône de base de données (📦) pour ouvrir le menu des outils, et cochez les cases sous **Always Think** :

- **Flash** — OFF par défaut. Cochez pour toujours activer le thinking pour les modèles Flash.
- **Flash Lite** — ON par défaut. Flash Lite a une différence de coût et de vitesse minimale avec le thinking activé, il est donc recommandé de le garder activé.

Quand une bascule est ON, le thinking est toujours actif pour cette famille de modèles indépendamment du contenu du message. Quand elle est OFF, la détection basée sur les mots-clés existante est utilisée.

![Always Think Settings](docs/images/setting_thinking.png)

### OpenAI

| Modèle | Description |
|--------|-------------|
| GPT-5.4 | Dernier modèle phare |
| GPT-5.4-mini | Modèle intermédiaire rentable |
| GPT-5.4-nano | Modèle léger et rapide |
| O3 | Modèle de raisonnement |
| DALL-E 3 / DALL-E 2 | Génération d'images |

### Anthropic

| Modèle | Description |
|--------|-------------|
| Claude Opus 4.6 | Modèle le plus performant, réflexion étendue |
| Claude Sonnet 4.6 | Équilibre entre performance et coût |
| Claude Haiku 4.5 | Modèle rapide et léger |

### OpenRouter / Grok / Custom

Configurez n'importe quel endpoint compatible OpenAI avec une URL de base et des modèles personnalisés. OpenRouter donne accès à des centaines de modèles de divers fournisseurs.

### OpenCode Zen / Go

OpenCode propose deux gateways hébergées depuis le même compte, toutes deux sélectionnables depuis le menu déroulant des fournisseurs :

- **OpenCode Zen** (`https://opencode.ai/zen`) — paiement à l'usage, inclut plusieurs modèles gratuits (Big Pickle, MiniMax M2.5 Free, etc.) et un large catalogue de modèles (Claude, GPT-5.x, et plus). Expose les endpoints `/v1/models` + `/v1/chat/completions` compatibles OpenAI, donc les modèles sont listés automatiquement.
- **OpenCode Go** (`https://opencode.ai/zen/go`) — abonnement de 5 $ le premier mois, puis 10 $/mois, avec des modèles de codage soigneusement sélectionnés (GLM, Kimi, DeepSeek, MiMo, MiniMax, Qwen). N'expose que `/v1/chat/completions`, donc le plugin se rabat sur une liste de modèles documentée lors du Verify.

### LLM Local

Connectez-vous à des modèles exécutés localement via Ollama, LM Studio, vLLM, AnythingLLM ou le serveur local OpenCode. Les modèles sont détectés automatiquement depuis le serveur en cours d'exécution.

## Installation

### BRAT (Recommandé)
1. Installez le plugin [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Ouvrez les paramètres BRAT → "Add Beta plugin"
3. Entrez : `https://github.com/takeshy/obsidian-llm-hub`
4. Activez le plugin dans les paramètres des plugins communautaires

### Manuel
1. Téléchargez `main.js`, `manifest.json`, `styles.css` depuis les releases
2. Créez le dossier `llm-hub` dans `.obsidian/plugins/`
3. Copiez les fichiers et activez dans les paramètres Obsidian

### Depuis les Sources
```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

## Configuration

### Fournisseurs API

Ajoutez un ou plusieurs fournisseurs API dans les paramètres du plugin. Chaque fournisseur a sa propre clé API et sa sélection de modèles.

| Fournisseur | Obtenir une Clé API |
|-------------|---------------------|
| Gemini | [ai.google.dev](https://ai.google.dev) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) |
| OpenRouter | [openrouter.ai](https://openrouter.ai) |
| Grok | [console.x.ai](https://console.x.ai) |
| OpenCode Zen | [opencode.ai](https://opencode.ai) |
| OpenCode Go | [opencode.ai](https://opencode.ai) |

Vous pouvez également ajouter des endpoints personnalisés compatibles OpenAI.

![Paramètres de Base](docs/images/setting_basic.png)

### LLM Local

Connectez-vous à des serveurs LLM exécutés localement :

1. Démarrez votre serveur local (Ollama, LM Studio, vLLM, AnythingLLM ou OpenCode)
2. Entrez l'URL du serveur dans les paramètres du plugin
3. Cliquez sur "Verify" pour détecter les modèles disponibles

> [!NOTE]
> Les LLMs locaux **LM Studio / vLLM / AnythingLLM** utilisent le Function Calling de style OpenAI pour les outils du coffre — activé par défaut pour les modèles compatibles avec les outils. Si un modèle rejette la première requête avec outils, il est marqué automatiquement et rétrogradé en mode skill basé sur des marqueurs pour les tours suivants ; effacez la marque dans **Paramètres → Local LLM → Re-enable tools** pour réessayer.
>
> **Ollama** et **OpenCode (Local)** utilisent toujours uniquement le mode marqueurs. Utilisez les workflows ou RAG pour les opérations sur les notes avec ces frameworks.

#### OpenCode Local Server

Le framework OpenCode se connecte à une instance locale `opencode serve`, qui expose sa propre API HTTP au lieu du format OpenAI-compatible `/v1/chat/completions`. Le streaming utilise l'endpoint SSE `/global/event` du serveur.

##### macOS / Linux

1. Installez la CLI OpenCode :
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```
2. Démarrez le serveur :
   ```bash
   opencode serve
   ```
   Il écoute sur `http://localhost:4096` par défaut.
3. Dans les paramètres du plugin → **Local LLM**, sélectionnez **OpenCode (Local)**, conservez l'URL par défaut (`http://localhost:4096`) et cliquez sur **Fetch models**.
4. Les modèles sont listés sous la forme `<providerID>/<modelID>` (par ex. `google/gemini-flash-lite-latest`). Choisissez-en un et enregistrez.

##### Windows (WSL)

OpenCode [recommande WSL](https://opencode.ai/docs/ja/windows-wsl) sous Windows pour les performances du système de fichiers et la compatibilité des outils. Comme Obsidian s'exécute sur l'hôte Windows, le serveur doit être lié à une interface accessible et — puisqu'il devient accessible depuis l'extérieur de WSL — **protégé par un mot de passe**.

1. Installez WSL ([guide officiel](https://learn.microsoft.com/windows/wsl/install) de Microsoft) et ouvrez un terminal WSL.
2. À l'intérieur de WSL, installez OpenCode :
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```
3. Démarrez le serveur lié à toutes les interfaces, avec un mot de passe :
   ```bash
   OPENCODE_SERVER_PASSWORD='your-password' opencode serve --hostname 0.0.0.0 --port 4096
   ```
   WSL2 transfère `localhost` vers l'hôte Windows automatiquement, donc depuis Obsidian l'URL est `http://localhost:4096`. Si cela ne se résout pas, exécutez `hostname -I` dans WSL et utilisez `http://<wsl-ip>:4096` à la place.
4. Dans les paramètres du plugin → **Local LLM** → **OpenCode (Local)** :
   - **Base URL** : `http://localhost:4096` (ou l'IP WSL)
   - **Username** : `opencode` (par défaut ; remplacez par `OPENCODE_SERVER_USERNAME` si vous l'avez défini)
   - **Password** : la valeur de `OPENCODE_SERVER_PASSWORD`

   Cliquez sur **Fetch models**, choisissez un modèle `<providerID>/<modelID>` et enregistrez.

### Mode CLI (Gemini / Claude / Codex)

**Gemini CLI :**
1. Installez [Gemini CLI](https://github.com/google-gemini/gemini-cli)
2. Authentifiez-vous avec `gemini` → `/auth`
3. Cliquez sur "Verify" dans la section Gemini CLI

**Claude CLI :**
1. Installez [Claude Code](https://github.com/anthropics/claude-code) : `npm install -g @anthropic-ai/claude-code`
2. Authentifiez-vous avec `claude`
3. Cliquez sur "Verify" dans la section Claude CLI

**Codex CLI :**
1. Installez [Codex CLI](https://github.com/openai/codex) : `npm install -g @openai/codex`
2. Authentifiez-vous avec `codex`
3. Cliquez sur "Verify" dans la section Codex CLI

**Limitations CLI :** Pas de support des outils du coffre, pas de recherche web, desktop uniquement

> [!NOTE]
> **Utilisation CLI uniquement :** Vous pouvez utiliser le mode CLI sans aucune clé API. Il suffit d'installer et de vérifier un outil CLI.

**Chemin CLI personnalisé :** Si la détection automatique du CLI échoue, cliquez sur l'icône d'engrenage (⚙️) à côté du bouton Verify pour spécifier manuellement le chemin du CLI. Le plugin recherche automatiquement les chemins d'installation courants, y compris les gestionnaires de versions (nodenv, nvm, volta, fnm, asdf, mise).

<details>
<summary><b>Windows : Comment trouver le chemin du CLI</b></summary>

Laissez le champ Chemin CLI vide et cliquez sur **Verify** — le plugin détecte automatiquement l'installation npm-global (vérifie `%APPDATA%\npm\node_modules`, `%PROGRAMFILES%\nodejs\node_modules` et les emplacements basés sur PATH) et exécute le vrai point d'entrée `.js` via `node`. L'installation autonome de Claude dans `%LOCALAPPDATA%\Programs\claude\claude.exe` est également détectée.

Ne définissez un chemin CLI personnalisé que si la détection automatique échoue. Les options suivantes fonctionnent toutes (de la plus sûre à la moins sûre) :

1. **Script `.js` (recommandé)** — ex. `C:\Users\YourName\AppData\Roaming\npm\node_modules\@google\gemini-cli\dist\index.js`. Exécuté via `node` (sans passer par `cmd.exe`).
2. **Exécutable `.exe`** — ex. `C:\Users\YourName\AppData\Local\Programs\claude\claude.exe`. Exécuté directement.
3. **Wrapper `.cmd` / `.bat`** — ex. `C:\Users\YourName\AppData\Roaming\npm\gemini.cmd`. Doit passer par `cmd.exe`, donc les prompts contenant `&`, `|`, `>`, `^` ou `%VAR%` peuvent poser problème.

Utilisez `Get-Command gemini` / `Get-Command claude` / `Get-Command codex` dans PowerShell pour trouver le chemin du wrapper ; saisissez-le directement (option 3) ou naviguez vers le `.js` / `.exe` adjacent pour les options plus sûres.
</details>

<details>
<summary><b>macOS / Linux : Comment trouver le chemin du CLI</b></summary>

1. Ouvrez un terminal et exécutez :
   ```bash
   which gemini
   ```
2. Entrez le chemin affiché (ex : `/home/user/.local/bin/gemini`) dans les paramètres du chemin CLI

Pour Claude CLI, utilisez `which claude`. Pour Codex CLI, utilisez `which codex`.

**Gestionnaires de versions Node.js :** Si vous utilisez nodenv, nvm, volta, fnm, asdf ou mise, le plugin détecte automatiquement le binaire node depuis les emplacements courants. Si la détection échoue, spécifiez directement le chemin du script CLI (ex : `~/.npm-global/lib/node_modules/@google/gemini-cli/dist/index.js`).
</details>

> [!TIP]
> **Astuce Claude CLI :** Les sessions de chat de LLM Hub sont stockées localement. Vous pouvez continuer les conversations en dehors d'Obsidian en exécutant `claude --resume` dans le répertoire de votre coffre pour voir et reprendre les sessions passées.

### Paramètres de l'Espace de Travail
- **Dossier de l'Espace de Travail** - Emplacement de l'historique de chat et des paramètres
- **Prompt Système** - Instructions additionnelles pour l'IA
- **Limites d'Outils** - Contrôler les limites d'appels de fonctions
- **Historique d'Édition** - Suivez et restaurez les modifications faites par l'IA

![Limite d'Outils & Historique d'Édition](docs/images/setting_tool_history.png)

### Chiffrement

Protégez votre historique de chat et vos journaux d'exécution de workflows par mot de passe séparément.

**Configuration :**

1. Définissez un mot de passe dans les paramètres du plugin (stocké de manière sécurisée via cryptographie à clé publique)

![Configuration initiale du chiffrement](docs/images/setting_initial_encryption.png)

2. Après la configuration, activez le chiffrement pour chaque type de journal :
   - **Chiffrer l'historique de chat IA** - Chiffre les fichiers de conversation de chat
   - **Chiffrer les journaux d'exécution de workflows** - Chiffre les fichiers d'historique de workflows

![Paramètres de chiffrement](docs/images/setting_encryption.png)

Chaque paramètre peut être activé/désactivé indépendamment.

**Fonctionnalités :**
- **Contrôles séparés** - Choisissez quels journaux chiffrer (chat, workflow, ou les deux)
- **Chiffrement automatique** - Les nouveaux fichiers sont chiffrés lors de la sauvegarde selon les paramètres
- **Mise en cache du mot de passe** - Entrez le mot de passe une fois par session
- **Visualiseur dédié** - Les fichiers chiffrés s'ouvrent dans un éditeur sécurisé avec aperçu
- **Option de déchiffrement** - Supprimez le chiffrement de fichiers individuels si nécessaire

**Fonctionnement :**

```
[Configuration - une fois lors de la définition du mot de passe]
Mot de passe → Générer paire de clés (RSA) → Chiffrer clé privée → Stocker dans les paramètres

[Chiffrement - pour chaque fichier]
Contenu du fichier → Chiffrer avec nouvelle clé AES → Chiffrer clé AES avec clé publique
→ Sauvegarder : données chiffrées + clé privée chiffrée (depuis les paramètres) + salt

[Déchiffrement]
Mot de passe + salt → Restaurer clé privée → Déchiffrer clé AES → Déchiffrer contenu
```

- La paire de clés est générée une fois (la génération RSA est lente), la clé AES est générée par fichier
- Chaque fichier stocke : contenu chiffré + clé privée chiffrée (copiée des paramètres) + salt
- Les fichiers sont autonomes — déchiffrables avec juste le mot de passe, sans dépendance au plugin

<details>
<summary>Script Python de déchiffrement (cliquez pour développer)</summary>

```python
#!/usr/bin/env python3
"""Déchiffrer les fichiers LLM Hub sans le plugin."""
import base64, sys, re, getpass
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import padding

def decrypt_file(filepath: str, password: str) -> str:
    with open(filepath, 'r') as f:
        content = f.read()

    match = re.match(r'^---\n([\s\S]*?)\n---\n([\s\S]*)$', content)
    if not match:
        raise ValueError("Format de fichier chiffré invalide")

    frontmatter, encrypted_data = match.groups()
    key_match = re.search(r'key:\s*(.+)', frontmatter)
    salt_match = re.search(r'salt:\s*(.+)', frontmatter)
    if not key_match or not salt_match:
        raise ValueError("Clé ou salt manquant dans frontmatter")

    enc_private_key = base64.b64decode(key_match.group(1).strip())
    salt = base64.b64decode(salt_match.group(1).strip())
    data = base64.b64decode(encrypted_data.strip())

    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100000)
    derived_key = kdf.derive(password.encode())

    iv, enc_priv = enc_private_key[:12], enc_private_key[12:]
    private_key_pem = AESGCM(derived_key).decrypt(iv, enc_priv, None)
    private_key = serialization.load_der_private_key(base64.b64decode(private_key_pem), None)

    key_len = (data[0] << 8) | data[1]
    enc_aes_key = data[2:2+key_len]
    content_iv = data[2+key_len:2+key_len+12]
    enc_content = data[2+key_len+12:]

    aes_key = private_key.decrypt(enc_aes_key, padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))

    return AESGCM(aes_key).decrypt(content_iv, enc_content, None).decode('utf-8')

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage : {sys.argv[0]} <fichier_chiffré>")
        sys.exit(1)
    password = getpass.getpass("Mot de passe : ")
    print(decrypt_file(sys.argv[1], password))
```

Requis : `pip install cryptography`

</details>

> **Avertissement :** Si vous oubliez votre mot de passe, les fichiers chiffrés ne peuvent pas être récupérés. Conservez votre mot de passe en lieu sûr.

> **Astuce :** Pour chiffrer tous les fichiers d'un répertoire en une fois, utilisez un workflow. Voir l'exemple "Chiffrer tous les fichiers d'un répertoire" dans [WORKFLOW_NODES_fr.md](docs/WORKFLOW_NODES_fr.md#obsidian-command).

![Processus de chiffrement des fichiers](docs/images/enc.png)

**Avantages de sécurité :**
- **Protégé du chat IA** - Les fichiers chiffrés ne peuvent pas être lus par les opérations de coffre de l'IA (outil `read_note`). Cela protège les données sensibles comme les clés API d'une exposition accidentelle pendant le chat.
- **Accès workflow avec mot de passe** - Les workflows peuvent lire les fichiers chiffrés en utilisant le nœud `note-read`. À l'accès, une boîte de dialogue de mot de passe apparaît, et le mot de passe est mis en cache pour la session.
- **Stockez les secrets en sécurité** - Au lieu d'écrire les clés API directement dans les workflows, stockez-les dans des fichiers chiffrés. Le workflow lit la clé à l'exécution après vérification du mot de passe.

### Recherche Sémantique (RAG)

Recherche vectorielle locale qui injecte du contenu pertinent du coffre dans les conversations LLM. Aucun serveur RAG externe requis — les embeddings sont générés et stockés localement.

**Configuration :**

1. Allez dans Paramètres → section RAG
2. Créez un nouveau paramètre RAG (cliquez `+`)
3. Configurez l'embedding :
   - **Par défaut (Gemini) :** Laissez Embedding Base URL vide — utilise l'API Gemini Embedding avec votre clé API Gemini
   - **Serveur personnalisé (Ollama etc.) :** Définissez Embedding Base URL et sélectionnez un modèle
4. Cliquez **Sync** pour construire l'index vectoriel depuis votre coffre
5. Sélectionnez le paramètre RAG dans le menu déroulant pour l'activer

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| **Embedding Base URL** | URL du serveur d'embedding personnalisé (vide = API Gemini) | vide |
| **Embedding API Key** | Clé API pour le serveur personnalisé (vide = clé Gemini) | vide |
| **Embedding Model** | Nom du modèle pour la génération d'embeddings | `gemini-embedding-2-preview` |
| **Chunk Size** | Caractères par chunk | 500 |
| **Chunk Overlap** | Chevauchement entre les chunks | 100 |
| **Pages PDF par fragment** | Nombre de pages PDF par fragment d'embedding (1–6) | 6 |
| **Top K** | Nombre maximum de chunks à récupérer par requête | 5 |
| **Score Threshold** | Score de similarité minimum (0.0–1.0) pour inclure dans les résultats | 0.5 |
| **Target Folders** | Limiter l'indexation à des dossiers spécifiques (vide = tous) | vide |
| **Exclude Patterns** | Patterns regex pour exclure des fichiers de l'indexation | vide |

> **Indexation multimodale** (images, PDF, audio, vidéo) est automatiquement activée lors de l'utilisation des modèles d'embedding natifs Gemini (`gemini-embedding-*`). Aucune configuration manuelle nécessaire.

**Index externe :**

Utiliser un index pré-construit au lieu de synchroniser depuis le coffre :

1. Activez le toggle **Utiliser un index externe**
2. Définissez le chemin absolu vers un répertoire contenant `index.json` et `vectors.bin`
3. Optionnellement, définissez Embedding Base URL pour l'embedding des requêtes (vide = API Gemini)
4. Le modèle d'embedding est auto-détecté depuis le fichier d'index

**Comment ça fonctionne :** Lorsque RAG est actif, chaque message de chat déclenche une recherche vectorielle locale. Les chunks pertinents sont injectés dans le prompt système comme contexte. Les sources sont affichées dans l'interface de chat — cliquez pour ouvrir la note référencée.

### Onglet RAG Search

L'onglet **RAG Search** fournit une interface dédiée pour rechercher, filtrer, modifier et envoyer les résultats RAG vers Chat ou Discussion.

![RAG Search](docs/images/rag-search.png)

- **Recherche sémantique** avec Top K et seuil de score ajustables
- **Filtre par mots-clés** pour affiner les résultats après la recherche
- **Éditeur de fragments** avec chargement des fragments adjacents (précédent/suivant) et suppression du chevauchement
- **Envoi vers Chat ou Discussion** — les résultats sélectionnés deviennent des pièces jointes modifiables
- **Paramètres d'index** (icône d'engrenage) — configurez la taille des fragments, le chevauchement, les dossiers cibles, la synchronisation et plus encore

> Pour plus de détails, consultez la [Documentation RAG Search](docs/RAG_SEARCH.md) ([日本語](docs/RAG_SEARCH_ja.md) | [中文](docs/RAG_SEARCH_zh.md) | [한국어](docs/RAG_SEARCH_ko.md) | [Français](docs/RAG_SEARCH_fr.md) | [Deutsch](docs/RAG_SEARCH_de.md) | [Español](docs/RAG_SEARCH_es.md) | [Português](docs/RAG_SEARCH_pt.md) | [Italiano](docs/RAG_SEARCH_it.md))

### AI Discussion

L'onglet **Discussion** fournit une arène de débat multi-modèle où plusieurs modèles d'IA discutent d'un sujet en parallèle, tirent des conclusions et votent pour la meilleure réponse.

![AI Discussion](docs/images/ai-discussion.png)

**Comment ça fonctionne :**

1. Ouvrez l'onglet **Discussion**
2. Entrez un thème de discussion
3. Ajoutez des participants — choisissez n'importe quel modèle disponible (API, CLI, Local LLM) ou User
4. Attribuez optionnellement des rôles aux participants (p. ex., "Affirmatif", "Critique")
5. Définissez le nombre de tours
6. Cliquez sur **Start Discussion**

![Discussion Setup](docs/images/ai-discussion-start.png)

**Déroulement de la discussion :**

1. **Tours de discussion** — Tous les participants répondent en parallèle. Chaque tour s'appuie sur les réponses précédentes.
2. **Conclusion** — Au dernier tour, chaque participant fournit sa conclusion.
3. **Vote** — Les participants au vote évaluent toutes les conclusions et votent pour la meilleure.
4. **Résultat** — Le gagnant (ou match nul) est annoncé. Sauvegardez la transcription complète comme note Markdown.

![Voting Results](docs/images/ai-discussion-voting.png)

**Fonctionnalités :**

- **N'importe quel modèle comme participant** — Mélangez les modèles librement (p. ex., Gemini vs Claude vs GPT)
- **Participation utilisateur** — Ajoutez-vous comme participant ou votant pour des discussions avec intervention humaine
- **Attribution de rôles** — Donnez à chaque participant une perspective (p. ex., "Optimiste", "Sceptique")
- **Participants au vote séparés** — Les participants au vote sont automatiquement synchronisés avec les participants de la discussion, mais peuvent être personnalisés indépendamment
- **Configuration persistante** — Les participants et votants sont sauvegardés et restaurés entre les sessions
- **Modal de paramètres** — Cliquez sur l'icône d'engrenage pour configurer le prompt système, le prompt de conclusion, le prompt de vote, le dossier de sortie et les tours par défaut
- **Sauvegarder comme note** — Exportez la discussion complète (tours, conclusions, votes, gagnant) comme fichier Markdown

### Commandes Slash
- Définir des modèles de prompts personnalisés déclenchés par `/`
- Modèle et recherche optionnels par commande

![Commandes Slash](docs/images/setting_slash_command.png)

## Prérequis

- Obsidian v0.15.0+
- Au moins l'un des suivants : clé API (Gemini, OpenAI, Anthropic, OpenRouter, Grok), serveur LLM local ou outil CLI
- Desktop uniquement (pour mobile, voir [Gemini Helper](https://github.com/takeshy/obsidian-gemini-helper))

## Confidentialité

**Données stockées localement :**
- Clés API (stockées dans les paramètres Obsidian)
- Historique des chats (fichiers Markdown, optionnellement chiffrés)
- Historique d'exécution des workflows (optionnellement chiffré)
- Index vectoriel RAG (stocké dans le dossier workspace)
- Clés de chiffrement (clé privée chiffrée avec votre mot de passe)

**Données envoyées aux fournisseurs LLM :**
- Les messages de chat et les pièces jointes sont envoyés au fournisseur API configuré (Gemini, OpenAI, Anthropic, OpenRouter, Grok ou endpoint personnalisé)
- Quand la Recherche Web est activée (Gemini uniquement), les requêtes sont envoyées à Google Search
- Les fournisseurs LLM locaux envoient les données uniquement à votre serveur local

**Données envoyées à des services tiers :**
- Les nœuds `http` des workflows peuvent envoyer des données à n'importe quelle URL spécifiée dans le workflow

**Fournisseurs CLI (optionnel) :**
- Quand le mode CLI est activé, les outils CLI externes (gemini, claude, codex) sont exécutés via child_process
- Cela se produit uniquement quand explicitement configuré et vérifié par l'utilisateur
- Le mode CLI exécute les outils CLI externes via child_process

**Bot Discord (optionnel) :**
- Lorsqu'il est activé, le plugin se connecte à Discord via WebSocket Gateway et envoie les messages des utilisateurs au fournisseur LLM configuré
- Le token du bot est stocké dans les paramètres Obsidian
- Le contenu des messages des canaux Discord est traité par le LLM — configurez les canaux/utilisateurs autorisés pour restreindre l'accès

**Serveurs MCP (optionnel) :**
- Les serveurs MCP (Model Context Protocol) peuvent être configurés dans les paramètres du plugin pour les nœuds `mcp` des workflows
- Les serveurs MCP sont des services externes qui fournissent des outils et capacités supplémentaires

**Notes de sécurité :**
- Vérifiez les workflows avant de les exécuter - les nœuds `http` peuvent transmettre des données du coffre à des endpoints externes
- Les nœuds `note` des workflows affichent un dialogue de confirmation avant d'écrire des fichiers (comportement par défaut)
- Les commandes slash avec `confirmEdits: false` appliqueront automatiquement les modifications de fichiers sans afficher les boutons Appliquer/Annuler
- Informations d'identification sensibles : Ne stockez pas de clés API ou de tokens directement dans le YAML des workflows (en-têtes `http`, paramètres `mcp`, etc.). Stockez-les plutôt dans des fichiers chiffrés et utilisez le nœud `note-read` pour les récupérer lors de l'exécution. Les workflows peuvent lire les fichiers chiffrés avec une demande de mot de passe.

Consultez les conditions d'utilisation de chaque fournisseur pour les politiques de rétention des données.

## Licence

MIT

## Liens

- [Documentation API Gemini](https://ai.google.dev/docs)
- [Documentation API OpenAI](https://platform.openai.com/docs)
- [Documentation API Anthropic](https://docs.anthropic.com)
- [Documentation OpenRouter](https://openrouter.ai/docs)
- [Ollama](https://ollama.com)
- [Documentation des Plugins Obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## Support

Si vous trouvez ce plugin utile, pensez à m'offrir un café !

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/takeshy)
