# 🐛 Checklist para Debugging e Documentação de Bugs

Use este checklist **toda vez que encontrar e corrigir um bug**. Copie, preencha e commit junto com o código.

---

## 📋 **FASE 1: REPRODUÇÃO**

- [ ] **Reproduzi o bug consistentemente**
  - [ ] Passos exatos documentados
  - [ ] Taxa de reprodução: ___ % (0-100%)
  - [ ] Funciona em: Chrome | Firefox | Safari | Edge (marque)

- [ ] **Vidência clara do problema**
  - [ ] Console mostra erro/warning específico
  - [ ] Network tab mostra requisição falhada
  - [ ] UI comportamento inesperado documentado

---

## 📊 **FASE 2: INVESTIGAÇÃO**

- [ ] **Isolei o componente responsável**
  - [ ] Arquivo(s): _______________
  - [ ] Ligne(s): _______________

- [ ] **Identiﬁquei a causa raiz**
  - [ ] É realmente o problema ou só um sintoma?
  - [ ] Apliquei "5 Whys":
    1. _______________
    2. _______________
    3. _______________
    4. _______________
    5. _______________

- [ ] **Procurei por padrões similares**
  - [ ] Grep: `grep -r "pattern" src/`
  - [ ] Encontrei | Não encontrei (marque)
  - [ ] Outros arquivos afetados? Sim | Não

---

## ✅ **FASE 3: IMPLEMENTAÇÃO**

- [ ] **Criei a fix**
  - [ ] Mudança é mínima e focada
  - [ ] Testes passam
  - [ ] Sem breaking changes

- [ ] **Verifiquei a solução**
  - [ ] Bug não reproduz mais
  - [ ] Taxa de sucesso: ___ %
  - [ ] Performance não foi afetada (sim | não)

- [ ] **Limpei código**
  - [ ] Removi logs de debug
  - [ ] Sem código comentado
  - [ ] Segue padrão do projeto

---

## 📝 **FASE 4: DOCUMENTAÇÃO**

- [ ] **Adicionei entrada em `CORREÇÕES_E_FIXES.md`**
  - [ ] Título descritivo
  - [ ] Seção "Problema"
  - [ ] Seção "Sintomas" com bullets
  - [ ] Seção "Causa Raiz" with "5 Whys"
  - [ ] Seção "Solução Aplicada" com código
  - [ ] Tabela de "Arquivos Modificados"
  - [ ] "Como Reproduzir (ANTES)" com passos
  - [ ] "Verificação (DEPOIS)" com confirmação
  - [ ] Seção "Impacto"
  - [ ] Seção "Referências" se aplicável

- [ ] **Procurei por problemas similares**
  - [ ] Existem em outro lugar? Sim | Não
  - [ ] Se sim, apliquei mesma fix: Sim | Não | N/A
  - [ ] Anotei em "Referências"

---

## 🧪 **FASE 5: TESTES**

- [ ] **Testes existentes passam**
  - [ ] `npm run test` ou `npm run test:watch`
  - [ ] Nenhuma regressão detectada

- [ ] **Adicionei teste para o bug (IMPORTANTE)**
  - [ ] Test file: _______________
  - [ ] Test case reproduz problema original
  - [ ] Test case falha SEM a fix
  - [ ] Test case passa COM a fix

- [ ] **Fiz testes manuais**
  - [ ] Cenário 1: _______________
  - [ ] Cenário 2: _______________
  - [ ] Cenário 3 (edge case): _______________

---

## 🚀 **FASE 6: COMMIT & DOCUMENTAÇÃO FINAL**

- [ ] **Commit message está descritivo**
  - [ ] Formato: `fix: [fix #1] Descrição breve`
  - [ ] Incluí link para `CORREÇÕES_E_FIXES.md`
  - [ ] Exemplo:
    ```
    fix: [fix #1] Race condition na autenticação
    
    - Simplificado fetchWithTimeout
    - Refatorado getSession useEffect
    - Melhorado logging
    
    Ver CORREÇÕES_E_FIXES.md para detalhes completos.
    Fecha problema de login intermitente.
    ```

- [ ] **Atualizei README se necessário**
  - [ ] Sim | Não | N/A

- [ ] **Anunciei a fix ao time** (se trabalho em equipe)
  - [ ] Slack message
  - [ ] PR description
  - [ ] Assinei a mudança

---

## 📊 **RESUMO FINAL**

**Problema**: _________________________________________________________

**Causa Raiz**: _________________________________________________________

**Solução**: _________________________________________________________

**Impacto**: _________________________________________________________

**Duração (horas)**: ___

**Dificuldade**: 🟢 Fácil | 🟡 Médio | 🔴 Difícil | 🟣 Muito Difícil

**Aprendizado para Futuro**: ________________________________________________

---

## 💡 **DICAS IMPORTANTES**

1. **Nunca commitar sem documentar** — futuros devs (ou você mesmo!) vão sofrer
2. **Sempre adicionar teste** — evita regressão
3. **Procurar padrões** — se viu uma vez, pode vir de novo
4. **Logs tem valor** — deixe os que ajudam diagnóstico
5. **Validar em múltiplos browsers** — bugs escondem aí

---

**Criado**: 11 de Abril de 2026
**Última atualização**: Hoje
**Use este template para CADA bug fixado**
