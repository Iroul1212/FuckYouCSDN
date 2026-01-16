// ==UserScript==
// @name         FuckYouCSDN
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  1. 拦截搜索请求，自动添加 -site:csdn.net (从源头绝育) 2. 彻底移除残留垃圾
// @author       Gemini & User
// @match        *://www.baidu.com/*
// @match        *://www.bing.com/*
// @match        *://cn.bing.com/*
// @match        *://www.google.com/*
// @match        *://www.google.com.hk/*
// @match        *://www.google.co.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=csdn.net
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // === 配置：你绝不想看见的域名 ===
    const BLOCK_SITE = "csdn.net";
    const BLOCK_QUERY = ` -site:${BLOCK_SITE}`;

    // === 模块一：输入劫持 (主动进攻) ===
    // 在你按下回车或点击搜索按钮的瞬间，修改你的搜索词
    function hijackInput() {
        // 针对各大搜索引擎的输入框选择器
        const inputSelectors = [
            'input[id="kw"]',       // 百度
            'input[id="sb_form_q"]',// 必应
            'input[name="q"]',      // Google
            'textarea[name="q"]'    // Google 新版可能用 textarea
        ];

        inputSelectors.forEach(selector => {
            const input = document.querySelector(selector);
            if (input) {
                // 监听键盘回车
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        appendBlockQuery(input);
                    }
                });

                // 监听整个表单的提交事件 (防止用户点击放大镜图标搜索)
                const form = input.closest('form');
                if (form) {
                    form.addEventListener('submit', () => {
                        appendBlockQuery(input);
                    });
                }
            }
        });
    }

    // 辅助函数：给搜索词加上 -site:csdn.net
    function appendBlockQuery(inputElement) {
        let val = inputElement.value;
        // 如果已经加过了，就不要重复加
        if (val && !val.includes(BLOCK_QUERY) && !val.includes(`-site:${BLOCK_SITE}`)) {
            inputElement.value = val + BLOCK_QUERY;
        }
    }

    // === 模块二：DOM 焚烧 (被动防御) ===
    // 即使漏网之鱼出现，也直接从源码中删除
    function incinerateGarbage() {
        // 1. 链接检测
        const links = document.querySelectorAll(`a[href*="${BLOCK_SITE}"]`);
        links.forEach(link => {
            nukeNode(link);
        });

        // 2. 文本来源检测 (针对百度的“来源：CSDN博客”)
        // 查找包含 CSDN 字样的小标签
        const texts = document.querySelectorAll('span, div, p, cite');
        texts.forEach(el => {
             // 限制长度防止误删正文，只杀来源标注
            if (el.innerText && el.innerText.length < 50 && /CSDN/i.test(el.innerText)) {
                nukeNode(el);
            }
        });
    }

    // 核心毁灭函数：找到最大的结果容器并删除
    function nukeNode(element) {
        const resultContainers = [
            '.result', '.c-container', '.result-op', // 百度
            '.b_algo', '.b_ans', 'li.b_algo',        // 必应
            '.g', '.MjjYud', 'div[data-hveid]'       // Google
        ];

        for (let selector of resultContainers) {
            const container = element.closest(selector);
            if (container) {
                container.remove(); // 注意：这里是 remove()，彻底删除节点，不再是 hidden
                console.log('已焚烧一条CSDN垃圾');
                return;
            }
        }
    }

    // === 执行逻辑 ===

    // 1. 页面加载完成后，挂载输入劫持监听器
    window.addEventListener('DOMContentLoaded', hijackInput);

    // 2. 启动定时清理 (应对动态加载)
    const observer = new MutationObserver(() => {
        incinerateGarbage();
        // 动态加载出来的输入框也要重新劫持
        hijackInput();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

})();
