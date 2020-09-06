import { Injectable, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConditionPack, DeleteConditionsById, FullConditionsModel, GeneralConfig } from '../../schemas/Conditions.schema';
import { ExchangeCoordinatorService } from '../../../exchange-coordinator/exchange-coordinator';
import { TechnicalIndicatorsService } from '../../../technical-indicators/technical-indicators.service';
import { BacktestedConditionModel } from '../../../models/PaqueteIndicadorTecnico';
import { cloneDeep } from 'lodash';
import { CronTypeTime } from '../../../app.service';

@Injectable()
export class ConditionRestService {
  constructor(
    @InjectModel('ConditionPack') private conditionModel: Model<ConditionPack>,
    private exchangeCoordinator: ExchangeCoordinatorService,
    private indicatorService: TechnicalIndicatorsService,
  ) {}

  async recoverAllConditionsByUserId(encondedUserID: any) {
    return await this.conditionModel.find({ user: decodeURIComponent(encondedUserID) }).exec();
  }

  async returnAll() {
    return await this.conditionModel.find();
  }

  public async returnById(id: string): Promise<ConditionPack> {
    return this.conditionModel.findById(id);
  }

  public deleteById(id: string) {
    return this.conditionModel.deleteOne({ _id: id });
  }

  async returnConditionsByTimeFrame(timeFrame: CronTypeTime) {
    return await this.conditionModel.find({ 'generalConfig.historicParams.interval': timeFrame });
  }

  public returnConditionsWithFixedExit() {
    return this.conditionModel.find({ 'conditionConfig.exit.typeExit': 'static' });
  }

  async changeState(encondedConditionId: any, conditionState: string) {
    let id = Number.parseInt(encondedConditionId);
    let state = conditionState;
    if (state == 'started' || state == 'stopped') {
      return await this.conditionModel.findOneAndUpdate(
        {
          'conditionConfig.id': id,
        },
        {
          $set: {
            'conditionConfig.$.state': state,
          },
        },
      );
    } else {
      throw new HttpException(`Non valid condition state ${state}`, 400);
    }
  }

  async deleteConditionsById(conditionsPack: DeleteConditionsById) {
    let resBusqueda = await this.conditionModel.find({ user: conditionsPack.user });
    resBusqueda.forEach(condicionPack => {
      let condicionesFiltradas = [];

      condicionPack.conditionConfig.forEach(condicion => {
        let idAnalizadoActualSubcondicion = conditionsPack.conditionsToDelete.indexOf(condicion.id);
        if (idAnalizadoActualSubcondicion == -1) {
          condicionesFiltradas.push(condicion);
        }
      });
      if (condicionPack.conditionConfig.length != condicionesFiltradas.length) {
        condicionPack.conditionConfig = cloneDeep(condicionesFiltradas);
        condicionPack.save();
      }

      condicionesFiltradas = [];
    });
  }

  async changeFundingAsset(encondedConditionId: any, fundingAsset: string) {
    let id = Number.parseInt(encondedConditionId);
    return await this.conditionModel.findOneAndUpdate(
      {
        'conditionConfig.id': id,
      },
      {
        $set: {
          'conditionConfig.$.fundingAsset': fundingAsset,
        },
      },
    );
  }

  public saveWrapper(wrapper: ConditionPack) {
    return this.conditionModel.findOneAndUpdate(
      {
        _id: wrapper._id,
      },
      wrapper,
    );
  }

  public newWrapper(condicion: ConditionPack) {
    if (condicion.conditionConfig && condicion.conditionConfig.every(entry => entry.indicatorConfig) && condicion.user) {
      const createdCondition: ConditionPack = new this.conditionModel({
        user: condicion.user,
        conditionConfig: condicion.conditionConfig,
        generalConfig: condicion.generalConfig,
      });
      return createdCondition.save();
    } else {
      throw new HttpException('Incorrect condition configuration!', 400);
    }
  }

  async getLatestTechnicalAndHistoricDataFromCondition(
    condicion: FullConditionsModel,
    generalConfig: GeneralConfig,
  ): Promise<BacktestedConditionModel> {
    return {
      fulfilled: [],
      extraData: await this.indicatorService.evaluateIndicator(
        condicion.indicatorConfig[0].indicatorParams,
        await (this.exchangeCoordinator.devolverHistoricoDependendiendoDelEXCHANGE(generalConfig) as any),
      ),
      conditionAssociated: condicion,
    };
  }
}
