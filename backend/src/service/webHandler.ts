import axios from 'axios';
import { parseStringPromise } from 'xml2js';

class WebHandler {
    async visit(url: string): Promise<string> {
        const response = await axios.get<string>(url, {
            timeout: 5000,
            responseType: 'text',
            headers: {
                'User-Agent': 'MakoraBot/1.0'
            }
        });
        return response.data;
    }

    async visitTxt(url: string): Promise<string> {
        const content = await this.visit(url);
        return content.trim();
    }

    async visitXml<T = any>(url: string): Promise<T> {
        const content = await this.visit(url);
        return await parseStringPromise(content, { explicitArray: false }) as T;
    }
}

export const webHandler = new WebHandler();