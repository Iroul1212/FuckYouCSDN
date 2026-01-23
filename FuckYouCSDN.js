// ==UserScript==
// @name         FuckYouCSDN
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  屏蔽CSDN搜索结果（严格域名校验，修复白屏bug）
// @author       Gemini & User
// @match        *://www.baidu.com/*
// @match        *://www.bing.com/*
// @match        *://cn.bing.com/*
// @match        *://www.google.com/*
// @match        *://www.google.com.hk/*
// @match        *://www.google.co.jp/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const BLOCK_SITE = "csdn.net";
    const BLOCK_QUERY = ` -site:${BLOCK_SITE}`;

    // === 注入 CSS 样式 (保持 CSS 隐藏模式) ===
    const css = `
        .fuck-csdn-hide {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
    `;
    if (typeof GM_addStyle !== "undefined") {
        GM_addStyle(css);
    } else {
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    // === 模块一：输入劫持 (保持不变) ===
    function hijackInput() {
        const inputSelectors = [
            'input[id="kw"]',       // 百度
            'input[id="sb_form_q"]',// 必应
            'input[name="q"]',      // Google
            'textarea[name="q"]'
        ];

        inputSelectors.forEach(selector => {
            const input = document.querySelector(selector);
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') appendBlockQuery(input);
                });
                const form = input.closest('form');
                if (form) {
                    form.addEventListener('submit', () => appendBlockQuery(input));
                }
            }
        });
    }

    function appendBlockQuery(inputElement) {
        let val = inputElement.value;
        if (val && !val.includes(BLOCK_SITE)) {
            inputElement.value = val + BLOCK_QUERY;
        }
    }

    // === 模块二：结果隐藏 (核心修正) ===
    function hideGarbage() {
        // 1. 初步筛选：查找所有 href 包含 csdn 的链接
        const links = document.querySelectorAll(`a[href*="${BLOCK_SITE}"]:not(.fuck-csdn-processed)`);

        links.forEach(link => {
            link.classList.add('fuck-csdn-processed'); // 标记已处理

            // === 核心修复步骤 ===
            // 必须校验 hostname，防止误伤搜索引擎内部带有 "-site:csdn.net" 参数的链接
            // link.hostname 会自动解析域名，如 "blog.csdn.net" 或 "www.bing.com"
            if (link.hostname && link.hostname.includes(BLOCK_SITE)) {
                hideNode(link);
            }
        });
    }

    function hideNode(element) {
        // 定义精确的结果容器选择器
        const resultContainers = [
            '.result', '.c-container', '.result-op', // 百度
            '.b_algo', 'li.b_algo', '.b_ans',        // 必应 (注意：.b_ans 有时用于问答卡片)
            '.g', '.MjjYud', 'div[data-hveid]'       // Google
        ];

        // 向上查找最近的匹配容器
        for (let selector of resultContainers) {
            const container = element.closest(selector);
            if (container) {
                container.classList.add('fuck-csdn-hide');
                // 找到一个容器后立即返回，避免继续向上查找误伤更大的父容器
                return;
            }
        }
    }

    // === 执行逻辑 ===
    window.addEventListener('DOMContentLoaded', hijackInput);
    window.addEventListener('load', () => {
        hijackInput();
        hideGarbage(); // load 时再执行一次彻底清理
    });

    const observer = new MutationObserver((mutations) => {
        let shouldScan = false;
        for(let mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldScan = true;
                break;
            }
        }
        if(shouldScan) {
            hideGarbage();
            hijackInput();
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

})();
