// ============================================
// LISTA 2026 • app.js (Profissional)
// ============================================
import { supabase } from './supabaseClient.js'

let userId = null
let subscription = null

// ============================================
// 1. AUTENTICAÇÃO
// ============================================
async function verificarAutenticacao() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
        window.location.href = 'login.html'
        return null
    }
    
    // Atualizar UI com dados do usuário
    const userEmail = session.user.email
    const emailDisplay = document.getElementById('userEmailDisplay')
    const avatarEl = document.getElementById('userAvatar')
    
    if (emailDisplay) emailDisplay.textContent = userEmail
    if (avatarEl) avatarEl.textContent = userEmail.charAt(0).toUpperCase()
    
    return session.user
}

// ============================================
// 2. LOGOUT
// ============================================
async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) {
        mostrarNotificacao('Erro ao sair: ' + error.message, 'error')
    } else {
        window.location.href = 'login.html'
    }
}

// ============================================
// 3. INICIALIZAR BANCO E TEMPO REAL
// ============================================
async function inicializarBanco() {
    const user = await verificarAutenticacao()
    if (!user) return
    
    userId = user.id
    
    // Subscription para atualizações em tempo real
    subscription = supabase
        .channel('lista-compras-realtime')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'itens_lista',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                console.log('🔄 Mudança detectada:', payload.eventType)
                carregarItens() // Atualiza a lista automaticamente
            }
        )
        .subscribe((status) => {
            console.log('📡 Subscription status:', status)
        })
    
    // Carregar itens iniciais
    await carregarItens()
}

// ============================================
// 4. CARREGAR ITENS
// ============================================
async function carregarItens() {
    const listaEl = document.getElementById('lista')
    if (!listaEl) return
    
    try {
        const { data: itens, error } = await supabase
            .from('itens_lista')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
        
        if (error) throw error
        
        renderizarLista(itens || [])
    } catch (error) {
        console.error('Erro ao carregar itens:', error)
        mostrarNotificacao('Erro ao carregar itens', 'error')
    }
}

// ============================================
// 5. RENDERIZAR LISTA
// ============================================
function renderizarLista(itens) {
    const listaEl = document.getElementById('lista')
    const emptyState = document.getElementById('empty-state')
    const counter = document.getElementById('item-counter')
    
    if (!listaEl) return
    
    // Limpar lista com animação
    listaEl.style.opacity = '0'
    
    setTimeout(() => {
        listaEl.innerHTML = ''
        
        // Atualizar contador
        if (counter) counter.textContent = itens.length
        
        // Mostrar/esconder empty state
        if (emptyState) {
            emptyState.style.display = itens.length === 0 ? 'flex' : 'none'
        }
        
        if (itens.length === 0) {
            listaEl.style.opacity = '1'
            return
        }
        
        // Renderizar cada item
        itens.forEach((item, index) => {
            const li = document.createElement('li')
            li.className = 'list-item'
            li.style.animationDelay = `${index * 0.05}s`
            li.setAttribute('data-id', item.id)
            
            // Toggle concluído
            const toggleBtn = document.createElement('button')
            toggleBtn.className = `toggle-btn ${item.concluido ? 'done' : ''}`
            toggleBtn.innerHTML = item.concluido ? '✓' : '○'
            toggleBtn.title = item.concluido ? 'Marcar como pendente' : 'Marcar como concluído'
            toggleBtn.addEventListener('click', () => toggleConcluido(item.id, !item.concluido))
            
            // Nome do item
            const span = document.createElement('span')
            span.className = `item-name ${item.concluido ? 'done' : ''}`
            span.textContent = item.nome
            
            // Botão deletar
            const deleteBtn = document.createElement('button')
            deleteBtn.className = 'delete-btn'
            deleteBtn.innerHTML = '🗑️'
            deleteBtn.title = 'Remover item'
            deleteBtn.addEventListener('click', () => deletarItem(item.id))
            
            // Container dos botões
            const btnGroup = document.createElement('div')
            btnGroup.className = 'btn-group'
            btnGroup.appendChild(toggleBtn)
            btnGroup.appendChild(deleteBtn)
            
            li.appendChild(span)
            li.appendChild(btnGroup)
            listaEl.appendChild(li)
        })
        
        // Mostrar lista com animação
        listaEl.style.opacity = '1'
    }, 150)
}

// ============================================
// 6. ADICIONAR ITEM
// ============================================
async function adicionarItem() {
    const input = document.getElementById('item-input')
    const nome = input.value.trim()
    
    if (!nome) {
        input.focus()
        input.style.animation = 'none'
        input.offsetHeight
        input.style.animation = 'shakeError 0.4s ease'
        return
    }
    
    if (!userId) {
        mostrarNotificacao('Usuário não autenticado!', 'error')
        return
    }
    
    // Desabilitar input e botão durante a operação
    const addBtn = document.getElementById('add-btn')
    input.disabled = true
    if (addBtn) addBtn.disabled = true
    
    try {
        const { error } = await supabase
            .from('itens_lista')
            .insert([{
                nome: nome,
                user_id: userId,
                concluido: false
            }])
        
        if (error) throw error
        
        // Limpar input e focar
        input.value = ''
        input.focus()
        
        // A lista atualiza automaticamente via subscription
        
    } catch (error) {
        console.error('Erro ao adicionar:', error)
        mostrarNotificacao('Erro ao adicionar item: ' + error.message, 'error')
    } finally {
        input.disabled = false
        if (addBtn) addBtn.disabled = false
        input.focus()
    }
}

// ============================================
// 7. TOGGLE CONCLUÍDO
// ============================================
async function toggleConcluido(id, novoEstado) {
    try {
        const { error } = await supabase
            .from('itens_lista')
            .update({ concluido: novoEstado })
            .eq('id', id)
        
        if (error) throw error
        // Atualização automática via subscription
        
    } catch (error) {
        console.error('Erro ao atualizar:', error)
        mostrarNotificacao('Erro ao atualizar item', 'error')
    }
}

// ============================================
// 8. DELETAR ITEM
// ============================================
async function deletarItem(id) {
    // Confirmação visual em vez de confirm()
    if (!confirm('Remover este item da lista?')) return
    
    try {
        const { error } = await supabase
            .from('itens_lista')
            .delete()
            .eq('id', id)
        
        if (error) throw error
        
        // Feedback visual
        const itemEl = document.querySelector(`[data-id="${id}"]`)
        if (itemEl) {
            itemEl.style.transform = 'translateX(100px)'
            itemEl.style.opacity = '0'
        }
        
        // A lista atualiza automaticamente via subscription
        
    } catch (error) {
        console.error('Erro ao deletar:', error)
        mostrarNotificacao('Erro ao remover item: ' + error.message, 'error')
        // Recarregar lista em caso de erro
        carregarItens()
    }
}

// ============================================
// 9. NOTIFICAÇÕES TOAST
// ============================================
function mostrarNotificacao(mensagem, tipo = 'info') {
    // Criar elemento de notificação se não existir
    let toast = document.getElementById('toast')
    if (!toast) {
        toast = document.createElement('div')
        toast.id = 'toast'
        toast.className = 'toast-notification'
        document.body.appendChild(toast)
    }
    
    // Configurar tipo
    const cores = {
        error: '#ef4444',
        success: '#10b981',
        info: '#6366f1'
    }
    
    toast.textContent = mensagem
    toast.style.background = cores[tipo] || cores.info
    toast.style.opacity = '1'
    toast.style.transform = 'translateY(0)'
    
    // Esconder após 3 segundos
    clearTimeout(toast._timeout)
    toast._timeout = setTimeout(() => {
        toast.style.opacity = '0'
        toast.style.transform = 'translateY(100px)'
    }, 3000)
}

// ============================================
// 10. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar banco de dados
    await inicializarBanco()
    
    // Configurar input
    const input = document.getElementById('item-input')
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') adicionarItem()
        })
    }
    
    // Configurar botão adicionar
    const addBtn = document.getElementById('add-btn')
    if (addBtn) {
        addBtn.addEventListener('click', adicionarItem)
    }
    
    // Configurar botão logout
    const logoutBtn = document.getElementById('logout-btn')
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout)
    }
    
    // Atualizar status online/offline
    function updateOnlineStatus() {
        const statusDot = document.querySelector('.status-dot')
        const statusText = document.querySelector('.status-text')
        
        if (!statusDot || !statusText) return
        
        if (navigator.onLine) {
            statusDot.classList.remove('offline')
            statusText.textContent = 'Online'
        } else {
            statusDot.classList.add('offline')
            statusText.textContent = 'Offline'
        }
    }
    
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    updateOnlineStatus()
})

// Limpar subscription ao sair
window.addEventListener('beforeunload', () => {
    if (subscription) {
        supabase.removeChannel(subscription)
    }
})

// Exportar funções globais (para compatibilidade)
window.adicionarItem = adicionarItem
window.toggleConcluido = toggleConcluido
window.deletarItem = deletarItem
window.logout = logout