// app.js - Lista de Compras com Supabase
import { supabase } from './supabaseClient.js'

// ============================================
// 1. VERIFICAÇÃO DE AUTENTICAÇÃO
// ============================================
async function verificarAutenticacao() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
        // Não autenticado - redireciona para login
        window.location.href = 'login.html'
        return null
    }
    
    // Atualiza email no menu
    const userEmail = session.user.email
    const emailDisplay = document.getElementById('userEmailDisplay')
    if (emailDisplay) {
        emailDisplay.textContent = userEmail
    }
    
    // Iniciais para avatar
    const avatarEl = document.querySelector('.avatar-initials')
    if (avatarEl) {
        avatarEl.textContent = userEmail.charAt(0).toUpperCase()
    }
    
    return session.user
}

// ============================================
// 2. LOGOUT
// ============================================
window.logout = async function() {
    const { error } = await supabase.auth.signOut()
    if (error) {
        alert('Erro ao sair: ' + error.message)
    } else {
        window.location.href = 'login.html'
    }
}

// ============================================
// 3. BANCO DE DADOS - LISTA DE COMPRAS
// ============================================
let userId = null
let subscription = null

// Inicializar banco de dados
async function inicializarBanco() {
    const user = await verificarAutenticacao()
    if (!user) return
    
    userId = user.id
    
    // Inscrever para atualizações em tempo real
    subscription = supabase
        .channel('lista-compras')
        .on(
            'postgres_changes',
            {
                event: '*',  // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'itens_lista',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                console.log('🔄 Mudança detectada:', payload)
                carregarItens()  // Recarrega a lista inteira
            }
        )
        .subscribe()
    
    // Carregar itens iniciais
    await carregarItens()
}

// Carregar todos os itens do usuário
async function carregarItens() {
    const listaEl = document.getElementById('lista')
    if (!listaEl) return
    
    const { data: itens, error } = await supabase
        .from('itens_lista')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
    
    if (error) {
        console.error('Erro ao carregar itens:', error)
        return
    }
    
    renderizarLista(itens || [])
}

// Renderizar lista no HTML
function renderizarLista(itens) {
    const listaEl = document.getElementById('lista')
    const emptyState = document.getElementById('empty-state')
    
    if (!listaEl) return
    
    // Limpar lista
    listaEl.innerHTML = ''
    
    if (itens.length === 0) {
        if (emptyState) emptyState.style.display = 'block'
        return
    }
    
    if (emptyState) emptyState.style.display = 'none'
    
    // Renderizar cada item
    itens.forEach(item => {
        const li = document.createElement('li')
        li.dataset.id = item.id
        
        li.innerHTML = `
            <span style="${item.concluido ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                ${escapeHtml(item.nome)}
            </span>
            <div style="display: flex; gap: 8px;">
                <button onclick="toggleConcluido('${item.id}', ${!item.concluido})" 
                        style="background: ${item.concluido ? '#10b981' : '#f59e0b'}; border: none; padding: 6px 12px; border-radius: 8px; color: white; cursor: pointer; font-size: 12px;">
                    ${item.concluido ? '✓' : '○'}
                </button>
                <button onclick="deletarItem('${item.id}')" 
                        style="background: #ef4444; border: none; padding: 6px 12px; border-radius: 8px; color: white; cursor: pointer; font-size: 12px;">
                    🗑️
                </button>
            </div>
        `
        
        listaEl.appendChild(li)
    })
    
    // Atualizar contador
    const counter = document.getElementById('item-counter')
    if (counter) {
        counter.textContent = itens.length
    }
}

// Função para escapar HTML (segurança)
function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

// ============================================
// 4. CRUD - ADICIONAR, TOGGLE, DELETAR
// ============================================
window.AdicionarItem = async function() {
    const input = document.getElementById('item')
    const nome = input.value.trim()
    
    if (!nome) {
        alert('Digite um item!')
        return
    }
    
    if (!userId) {
        alert('Usuário não autenticado!')
        return
    }
    
    const { error } = await supabase
        .from('itens_lista')
        .insert([{
            nome: nome,
            user_id: userId,
            concluido: false
        }])
    
    if (error) {
        console.error('Erro ao adicionar:', error)
        alert('Erro ao adicionar item: ' + error.message)
    } else {
        input.value = ''
        input.focus()
        // A lista será atualizada automaticamente pelo subscription
    }
}

window.toggleConcluido = async function(id, novoEstado) {
    const { error } = await supabase
        .from('itens_lista')
        .update({ concluido: novoEstado })
        .eq('id', id)
    
    if (error) {
        console.error('Erro ao atualizar:', error)
    }
    // Atualização automática via subscription
}

window.deletarItem = async function(id) {
    if (!confirm('Remover este item?')) return
    
    const { error } = await supabase
        .from('itens_lista')
        .delete()
        .eq('id', id)
    
    if (error) {
        console.error('Erro ao deletar:', error)
        alert('Erro ao remover item')
    }
    // Atualização automática via subscription
}

// ============================================
// 5. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await inicializarBanco()
    
    // Configurar enter no input
    const input = document.getElementById('item')
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                AdicionarItem()
            }
        })
    }
    
    // Configurar dropdown do menu
    const userMenuBtn = document.getElementById('userMenuBtn')
    const userDropdown = document.getElementById('userDropdown')
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            userDropdown.classList.toggle('active')
        })
        document.addEventListener('click', () => {
            userDropdown.classList.remove('active')
        })
    }
    
    // Status online/offline
    function updateOnlineStatus() {
        const dot = document.querySelector('.status-dot')
        const text = document.querySelector('.status-text')
        if (navigator.onLine) {
            dot?.classList.remove('offline')
            if (text) text.textContent = 'Online'
        } else {
            dot?.classList.add('offline')
            if (text) text.textContent = 'Offline'
        }
    }
    
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    updateOnlineStatus()
})

// Limpar subscription ao sair da página
window.addEventListener('beforeunload', () => {
    if (subscription) {
        supabase.removeChannel(subscription)
    }
})