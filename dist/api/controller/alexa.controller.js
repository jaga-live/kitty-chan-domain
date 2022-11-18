"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlexaController = void 0;
const inversify_1 = require("inversify");
const inversify_express_utils_1 = require("inversify-express-utils");
const inversify_types_1 = require("../../core/inversify.types");
const alexa_service_1 = require("../service/alexa.service");
let AlexaController = class AlexaController {
    constructor(alexaService) {
        this.alexaService = alexaService;
    }
    textServer(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { message, username, messageType } = req.body;
            console.log(req.body, 'REQUEST BODY');
            yield this.alexaService.textServer(message, username, messageType);
            return {
                message: 'Message Sent'
            };
        });
    }
};
__decorate([
    (0, inversify_express_utils_1.httpPost)('/server/text'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AlexaController.prototype, "textServer", null);
AlexaController = __decorate([
    (0, inversify_express_utils_1.controller)('/alexa/ask'),
    __param(0, (0, inversify_1.inject)(inversify_types_1.TYPES.AlexaService)),
    __metadata("design:paramtypes", [alexa_service_1.AlexaService])
], AlexaController);
exports.AlexaController = AlexaController;